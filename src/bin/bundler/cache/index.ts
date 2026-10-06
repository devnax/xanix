import { Plugin } from "rolldown";
import { createRequire } from "node:module";
import { isPackageImport, makeFilename } from "./utils.js";
import buildCache from "./buildCache.js";
import { walk } from "oxc-walker";
import { builtinModules } from "node:module";
import logger from "../../include/logger.js";

const nodeBuiltins = new Set(builtinModules);

function isNodeBuiltin(id: string): boolean {
  const normalized = id.startsWith("node:") ? id.slice(5) : id;

  return nodeBuiltins.has(normalized);
}

const require = createRequire(import.meta.url);

function getParserLanguage(id: string): "js" | "jsx" | "ts" | "tsx" {
  const cleanId = id.split("?")[0];
  if (cleanId.endsWith(".tsx")) return "tsx";
  if (cleanId.endsWith(".ts")) return "ts";
  if (cleanId.endsWith(".jsx")) return "jsx";

  return "js";
}

export type CachedModule = {
  module: string;
  name: string;
  resolved: string;
  exports: string[];
  default: boolean;
};

function makeImportName(name: string): string {
  return `require_${name.replace(/[^a-zA-Z0-9_$]/g, "_")}`;
}

const XanixCache = (): Plugin => {
  const cached = new Map<string, CachedModule>();
  let init = false;
  let cacheChanged = false;

  return {
    name: "__xmod",

    async resolveId(source) {
      if (source.startsWith("/__xmod")) {
        return {
          id: source,
          external: true,
        };
      }

      return null;
    },

    async transform(code, id) {
      if (id.includes("/node_modules/") || id.includes("/.xanix/")) {
        return null;
      }

      /*
       * Very important for watch performance.
       *
       * Most files will not contain an import that needs
       * Xanix cache transformation. Don't parse those files.
       */
      if (!code.includes("import ") && !code.includes("import(")) {
        return null;
      }

      const lang = getParserLanguage(id);
      const ast = this.parse(code, { lang });
      const packages: string[] = [];
      const replacements: {
        start: number;
        end: number;
        value: string;
      }[] = [];

      walk(ast, {
        enter(node) {
          if (node.type !== "ImportDeclaration" || node.importKind === "type") {
            return;
          }

          const source = node.source.value;

          if (
            typeof source !== "string" ||
            !isPackageImport(source) ||
            source === "xanix" ||
            isNodeBuiltin(source)
          ) {
            return;
          }

          /*
           * Don't add the same package multiple times
           * when the file imports it more than once.
           */
          if (!packages.includes(source)) {
            packages.push(source);
          }

          const name = makeFilename(source);
          const importName = makeImportName(name);
          const cachePath = `/__xmod/${name}.js`;
          const lines: string[] = [];
          const specifiers = (node.specifiers ?? []).filter(
            (specifier: any) => specifier.importKind !== "type",
          );

          if (!specifiers.length) {
            lines.push(`import "${cachePath}";`);
          } else {
            const defaultSpecifier = specifiers.find(
              (specifier: any) => specifier.type === "ImportDefaultSpecifier",
            );

            const namespaceSpecifier = specifiers.find(
              (specifier: any) => specifier.type === "ImportNamespaceSpecifier",
            );

            const namedSpecifiers = specifiers.filter(
              (specifier: any) => specifier.type === "ImportSpecifier",
            );

            /*
             * Only import default when the original import
             * actually has a default import.
             */
            if (defaultSpecifier) {
              lines.push(`import ${importName} from "${cachePath}";`);
              lines.push(
                `const ${defaultSpecifier.local.name} = ${importName};`,
              );
            }

            /*
             * Namespace and named imports use the Xanix
             * namespace export.
             */
            if (namespaceSpecifier || namedSpecifiers.length) {
              const namespaceName = `${importName}_ns`;

              lines.push(
                `import { __xanix_namespace as ${namespaceName} } from "${cachePath}";`,
              );

              if (namespaceSpecifier) {
                lines.push(
                  `const ${namespaceSpecifier.local.name} = ${namespaceName};`,
                );
              }

              if (namedSpecifiers.length) {
                const properties = namedSpecifiers
                  .map((specifier: any) => {
                    const imported =
                      specifier.imported?.type === "Identifier"
                        ? specifier.imported.name
                        : specifier.imported?.value;

                    const local = specifier.local?.name;

                    if (!imported || !local) {
                      return null;
                    }

                    if (imported !== local) {
                      if (
                        typeof imported === "string" &&
                        !/^[$A-Z_a-z][$\w]*$/.test(imported)
                      ) {
                        return `${JSON.stringify(imported)}: ${local}`;
                      }

                      return `${imported}: ${local}`;
                    }

                    return imported;
                  })
                  .filter(Boolean)
                  .join(", ");

                if (properties) {
                  lines.push(`const { ${properties} } = ${namespaceName};`);
                }
              }
            }
          }

          /*
           * Add the package only once.
           */
          if (!cached.has(source)) {
            cacheChanged = true;

            cached.set(source, {
              module: source,
              name,
              resolved: "",
              exports: [],
              default: false,
            });
          }

          replacements.push({
            start: node.start,
            end: node.end,
            value: lines.join("\n"),
          });
        },
      });

      if (!replacements.length) {
        return null;
      }

      /*
       * Resolve ONLY newly discovered packages.
       *
       * Never loop through the entire cache here.
       */
      for (const source of packages) {
        const cache = cached.get(source);
        if (!cache || cache.resolved) {
          continue;
        }

        try {
          const resolved: any = await this.resolve(source, id);
          if (!resolved?.id) {
            continue;
          }

          cache.resolved = resolved.id;
          const mod = require(resolved.id);
          cache.exports = Object.keys(mod);
          cache.default = Object.prototype.hasOwnProperty.call(mod, "default");
        } catch (error) {
          cached.delete(source);
        }
      }

      /*
       * Apply replacements only when this file actually
       * contained cacheable imports.
       */
      const sorted = replacements.sort((a, b) => b.start - a.start);
      for (const { start, end, value } of sorted) {
        code = code.slice(0, start) + value + code.slice(end);
      }

      return {
        code,
        map: null,
      };
    },

    async generateBundle() {
      if (!cacheChanged) {
        return;
      }

      cacheChanged = false;

      if (init) {
        logger.info("[__xmod] building cache");
      }
      init = true;
      await buildCache(cached);
    },
  };
};

export default XanixCache;
