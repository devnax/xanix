import path from "node:path";
import { type Plugin, rolldown } from "rolldown";
import { createRequire } from "node:module";
import { tsconfigPathsMatcher } from "../XanixTsconfigAlias.js";
import { esmExternalRequirePlugin } from "rolldown/plugins";
import fs from "node:fs";
import loadEnv from "../../config/loadEnv.js";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const cacheDir = path.join(process.cwd(), ".xanix/cache");
const cached = new Map<
  string,
  {
    file: string;
    filename: string;
    id: string;
  }
>();

export type XanixCacheOptions = {
  cacheDir?: string;
  define?: Record<string, any>;
};

type BuildOptions = {
  id: string;

  define?: Record<string, any>;
};

const makeFilename = (id: string) =>
  id.replace(/[\/\\]/g, "-").replaceAll("@", "");

const makeEsmShim = async (resolved: string): Promise<string> => {
  let namedExports: string[] = [];
  let hasDefault = false;
  try {
    const mod = await import(pathToFileURL(resolved).href);
    hasDefault =
      mod &&
      (typeof mod === "object" || typeof mod === "function") &&
      "default" in mod;
    namedExports = Object.keys(mod).filter(
      (key) => key !== "__esModule" && key !== "default",
    );
  } catch (err) {
    console.warn(`[cache-deps] failed to inspect ${resolved}:`, err);
  }

  const lines = [`import * as __mod from ${JSON.stringify(resolved)};`];
  lines.push(
    hasDefault ? `export default __mod.default;` : `export default __mod;`,
  );

  for (const exportName of namedExports) {
    if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(exportName)) {
      lines.push(
        `export const ${exportName} = __mod[${JSON.stringify(exportName)}];`,
      );
    }
  }

  return lines.join("\n");
};

const resolveDependency = (id: string): string => {
  try {
    return require.resolve(id);
  } catch {
    // Try common extension substitutions.
    const candidates = [
      id.replace(/\.js$/, ".mjs"),
      id.replace(/\.js$/, ".cjs"),
      `${id}.mjs`,
      `${id}.cjs`,
    ];

    for (const candidate of candidates) {
      try {
        return require.resolve(candidate);
      } catch {}
    }

    throw new Error(`Cannot resolve dependency: ${id}`);
  }
};

const XanixCache = ({
  cacheDir = "./.xanix/cache",
  define,
}: XanixCacheOptions): Plugin => {
  const dependencyMap = new Map<
    string,
    {
      filename: string;
      resolved: string;
      code: string;
    }
  >();

  const plugins = {
    name: "XanixCache",

    buildStart() {
      dependencyMap.clear();
    },

    watchChange() {
      dependencyMap.clear();
    },

    async resolveId(id: any) {
      if (
        id.startsWith(".") ||
        path.isAbsolute(id) ||
        id === "virtual:xanix-document" ||
        tsconfigPathsMatcher(id)
      ) {
        return null;
      }

      try {
        let info: any = dependencyMap.get(id);
        if (!info) {
          const resolved = resolveDependency(id);
          console.log(resolved);

          info = {
            filename: `${makeFilename(id)}.js`,
            code: await makeEsmShim(resolved),
            resolved,
          };
          dependencyMap.set(id, info);
        }

        return {
          id: `/.xanix/cache/${info.filename}`,
          external: true,
        };
      } catch (error) {}

      return null;
    },

    async generateBundle() {
      const manifestPath = path.resolve(cacheDir, "cache-manifest.json");
      const currentManifest = fs.existsSync(manifestPath)
        ? JSON.parse(fs.readFileSync(manifestPath, "utf-8"))
        : {};

      let changed = false;
      const inputs: any = {};
      const manifest: Record<string, any> = {};

      for (const id of dependencyMap.keys()) {
        if (
          !currentManifest[id] ||
          currentManifest[id].resolved !== dependencyMap.get(id)?.resolved
        ) {
          changed = true;
        }
        inputs[makeFilename(id)] = `dep:${id}`;
        manifest[id] = {
          filename: dependencyMap.get(id)?.filename,
          resolved: dependencyMap.get(id)?.resolved,
        };
      }

      if (!changed) {
        return;
      }

      const bundle = await rolldown({
        input: inputs,
        treeshake: true,
        tsconfig: true,
        resolve: {
          extensions: [".mjs", ".js", ".jsx", ".json", ".ts", ".tsx"],
          conditionNames: ["browser", "import", "module", "default"],
        },
        transform: {
          target: "es2022",
          jsx: {
            runtime: "automatic",
          },
          define: await loadEnv({
            mode: "development",
            isClient: true,
          }),
        },

        plugins: [
          {
            name: "generate",
            resolveId(id: string) {
              if (id.startsWith("dep:")) {
                return id;
              }
              return null;
            },
            async load(id: string) {
              if (id.startsWith("dep:")) {
                const code = dependencyMap.get(id.replace("dep:", ""))?.code;
                return code;
              }
              return null;
            },
          },
        ],
      });
      await bundle.write({
        dir: cacheDir,
        format: "esm",
        exports: "auto",
        sourcemap: true,
        codeSplitting: true,
        entryFileNames: `[name].js`,
      });

      await bundle.close();

      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    },
  };

  return plugins;
};

export default XanixCache;
