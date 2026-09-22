import { xanixCachePlugins, xanixDefaultPlugins } from "./plugins/plugins.js";
import path from "path";
import fs from "fs";
import { Plugin, rolldown } from "rolldown";
import loadEnv from "./config/loadEnv.js";
import { tsconfigPathsMatcher } from "./plugins/XanixTsconfigAlias.js";
import { builtinModules } from "module";
const nodeBuiltins = new Set(builtinModules);

function isNodeBuiltin(id: string): boolean {
  const normalized = id.startsWith("node:") ? id.slice(5) : id;
  return nodeBuiltins.has(normalized);
}
const makeFilename = (id: string) => {
  let root = process.cwd().replace(/\\/g, "/").replace(/\/+/g, "/");
  id = id
    .trim()
    .replace(/\\/g, "/")
    .replace(/\/+/g, "-")
    .replace(`${root}/`, "")
    .replace("node_modules/", "")
    .toLowerCase()
    .split("?")[0];
  return id;
};

function isPackageImport(source: string) {
  // Relative import
  if (source.startsWith("./") || source.startsWith("../")) {
    return false;
  }
  // Absolute filesystem path
  if (source.startsWith("/") || /^[A-Za-z]:[\\/]/.test(source)) {
    return false;
  }
  // URL / virtual module
  if (
    source.startsWith("node:") ||
    source.includes(":") ||
    source.startsWith("\0")
  ) {
    return false;
  }
  // Everything else is a bare package specifier
  return true;
}

const writeManifest = async (cached: Map<string, string>) => {
  const file = path.resolve("node_modules/xanix-cache/manifest.json");
  let manifest: any = {};
  console.log(cached);

  for (const [key, value] of cached.entries()) {
    manifest[key] = value;
  }
  await fs.promises.writeFile(file, JSON.stringify(manifest, null, 2));
};

const readManifest = async () => {
  const file = path.resolve("node_modules/xanix-cache/manifest.json");
  if (!fs.existsSync(file)) {
    return new Map();
  }
  const content = await fs.promises.readFile(file, "utf-8");
  const parsed = JSON.parse(content);
  const map = new Map(Object.entries(parsed));
  return map;
};

const externalResolver = (): Plugin => {
  let initialBuild = false;
  const cache = new Map();

  return {
    name: "externalResolver",

    async buildStart() {
      if (initialBuild) {
        return;
      }
      initialBuild = true;
      const cacheDir = path.resolve("node_modules/xanix-cache");

      // delete cache directory if it exists
      if (fs.existsSync(cacheDir)) {
        fs.rmSync(cacheDir, { recursive: true, force: true });
      }

      if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
        fs.writeFileSync(
          path.join(cacheDir, "package.json"),
          JSON.stringify({ type: "module" }),
        );
      }
    },
    async resolveId(source, importer) {
      if (!importer) {
        return null;
      }

      if (source.startsWith("xanix-cache")) {
        return {
          id: source,
          external: true,
        };
      }

      if (importer.includes("node_modules")) {
        return null;
      }

      if (source.startsWith("xanix")) {
        return null;
      }

      if (!isPackageImport(source)) {
        return null;
      }

      const name = makeFilename(source);
      cache.set(source, name);
      return {
        id: `xanix-cache/${name}.js`,
        external: true,
      };
    },

    transform(code) {
      let changed = false;

      const transformed = code.replace(
        /import\s*\{([^}]+)\}\s*from\s*(['"])([^'"]+)\2\s*;?/g,
        (match, imports: string, quote: string, source: string) => {
          if (source.startsWith("xanix")) {
            return match;
          }
          if (!isPackageImport(source)) {
            return match;
          }

          const cleanSource = source.split("?")[0];
          const name = makeFilename(cleanSource);
          cache.set(cleanSource, name);
          changed = true;

          const localName = `_${name.replace(/[^a-zA-Z0-9_$]/g, "_")}`;

          const declarations = imports
            .split(",")
            .map((item: string) => {
              const [imported, local] = item
                .trim()
                .split(/\s+as\s+/)
                .map((x) => x.trim());

              return local ? `${imported}: ${local}` : imported;
            })
            .join(", ");

          return [
            `import ${localName} from ${quote}xanix-cache/${name}.js${quote};`,
            `const { ${declarations} } = ${localName};`,
          ].join("\n");
        },
      );

      if (!changed) {
        return null;
      }
      return {
        code,
        map: null,
      };
    },

    async generateBundle() {
      let manifest = await readManifest();
      let changed = false;
      const input: Record<string, string> = {};

      for (const [source, name] of cache.entries()) {
        input[name] = source;
        if (!manifest.has(source)) {
          manifest.set(source, name);
          changed = true;
        }
      }
      if (!changed) {
        return;
      }

      const build = await rolldown({
        input,
        treeshake: true,
        platform: "node",
        tsconfig: true,

        resolve: {
          extensions: [".mjs", ".js", ".jsx", ".json", ".ts", ".tsx"],

          conditionNames: ["node", "import", "module", "default"],
        },

        transform: {
          target: "node20",

          jsx: {
            runtime: "automatic",
          },

          define: await loadEnv({
            mode: "development",
            isClient: false,
          }),
        },
        external(id) {
          if (isNodeBuiltin(id)) {
            return true;
          }

          if (id === "is-promise") {
            return true;
          }

          if (id === "virtual:xanix-document" || tsconfigPathsMatcher(id)) {
            return false;
          }

          return false;
        },
      });

      await build.write({
        dir: "node_modules/xanix-cache",
        format: "es",
        entryFileNames: "[name].js",
      });

      await build.close();
      await writeManifest(manifest);
    },
  };
};

export default externalResolver;
