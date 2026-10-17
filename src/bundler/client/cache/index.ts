import { Plugin } from "rolldown";
import { createRequire } from "node:module";
import {
  isPackageImport,
  makeFilename,
  readManifest,
  writeManifest,
} from "./utils.js";
import buildCache from "./buildCache.js";
import { CachedModule } from "./types.js";
import logger from "../../../include/logger.js";
import pc from "picocolors";
import findImports from "../../../include/code/findImports.js";

const require = createRequire(import.meta.url);

function makeImportName(name: string): string {
  return `require_${name.replace(/[^a-zA-Z0-9_$]/g, "_")}`;
}

const XanixCache = (): Plugin => {
  const cached = new Map<string, CachedModule>();

  const isChanged = async () => {
    const cachedManifest = await readManifest();
    const pmodules = Array.from(cachedManifest.values()).map((m) => m.module);
    const cmodule = Array.from(cached.values()).map((m) => m.module);
    const hasChanges =
      pmodules.some((m) => !cmodule.includes(m)) ||
      cmodule.some((m) => !pmodules.includes(m));
    return hasChanges;
  };

  return {
    name: "__xmod",

    async buildStart() {
      cached.clear();
      const cachedManifest = await readManifest();
      for (const [key, value] of cachedManifest) {
        cached.set(key, value);
      }
    },

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

      if (!code.includes("import ") && !code.includes("import(")) {
        return null;
      }

      const packages: string[] = [];
      let replacements: {
        source: string;
        start: number;
        end: number;
        value: string;
      }[] = [];

      let counter = 0;

      for (const imp of findImports(code)) {
        if (imp.typeOnly) continue;

        const source = imp.source;
        if (!isPackageImport(source)) continue;

        /*
         * Don't add the same package multiple times
         * when the file imports it more than once.
         */
        if (!packages.includes(source)) {
          packages.push(source);
        }

        const name = makeFilename(source);
        const cachePath = `/__xmod/${name}.js`;
        const named = imp.named.filter((s) => !s.typeOnly);

        /*
         * Unique per import statement (require_react, require_react1, ...)
         * so the same package imported twice never redeclares a binding.
         */
        const local = `${makeImportName(name)}${counter++ || ""}`;
        const mod = `_${local}`; // `import * as` keeps this name in the bundle
        const ns = `${mod}.__xmod`;

        const bindings: string[] = [];
        if (imp.default) bindings.push(local);
        if (imp.namespace || named.length) bindings.push(`* as ${mod}`);

        const lines = [
          bindings.length
            ? `import ${bindings.join(", ")} from "${cachePath}";`
            : `import "${cachePath}";`,
        ];

        if (imp.default) lines.push(`const ${imp.default} = ${local};`);
        if (imp.namespace) lines.push(`const ${imp.namespace} = ${ns};`);
        if (named.length) {
          const props = named
            .map(({ imported, local }) =>
              imported !== local ? `${imported}: ${local}` : imported,
            )
            .join(", ");

          lines.push(`const { ${props} } = ${ns};`);
        }

        const cache = cached.get(source);
        cached.set(source, {
          module: source,
          name,
          resolved: cache ? cache.resolved : "",
          exports: [],
          default: false,
        });

        replacements.push({
          source,
          start: imp.start,
          end: imp.end,
          value: lines.join("\n"),
        });
      }

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
        if (!cache || cache.resolved) continue;
        try {
          const resolved: any = await this.resolve(source, id);
          if (!resolved?.id) {
            continue;
          }

          if (!resolved.id.includes("node_modules")) {
            throw new Error(
              `Resolved module ${resolved.id} is not in node_modules`,
            );
          }

          cache.resolved = resolved.id;
          const mod = require(resolved.id);
          cache.exports = Object.keys(mod);
          cache.default = Object.prototype.hasOwnProperty.call(mod, "default");
        } catch (error) {
          cached.delete(source);
        }
      }

      for (let rep of replacements) {
        const cache = cached.get(rep.source);
        if (
          !cache ||
          !cache.resolved ||
          !cache.resolved.includes("node_modules")
        ) {
          replacements = replacements.filter((r) => r.source !== rep.source);
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
      if (await isChanged()) {
        logger.info(`${pc.yellow("Optimizing dependencies")} `, "[optimize]");
        await buildCache(cached);
        await writeManifest(cached);
      }
    },
  };
};

export default XanixCache;
