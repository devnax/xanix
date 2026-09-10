import path from "node:path";
import { type Plugin, rollup } from "rollup";
import { createRequire } from "node:module";
import fs from "node:fs";
import { pathToFileURL } from "node:url";
import { tsconfigPathsMatcher } from "./plugins/XanixTsconfigAlias.js";
import defines from "./config/defines.js";
import commonjs from "@rollup/plugin-commonjs";
import { xanixDefaultPlugins } from "./plugins/plugins.js";
import json from "@rollup/plugin-json";
import esbuild from "rollup-plugin-esbuild";
import url from "@rollup/plugin-url";
import XanixEnvPlugin from "./plugins/XanixEnv.js";
import nodeResolve from "@rollup/plugin-node-resolve";

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
        tsconfigPathsMatcher(id) ||
        id.includes(".jsx")
      ) {
        return null;
      }

      console.log(id);

      return {
        id: id,
        external: true,
      };

      try {
        let info: any = dependencyMap.get(id.replace("dep:", ""));
        if (!info) {
          const resolved = resolveDependency(id);

          info = {
            filename: `${makeFilename(id)}.js`,
            code: await makeEsmShim(resolved),
            resolved,
          };
          dependencyMap.set(id, info);
        }

        return {
          id: id, //`/.xanix/cache/${info.filename}`,
          external: true,
        };
      } catch (error) {
        console.log(id);
      }

      return null;
    },

    async generateBundle() {
      return;
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

      const bundle = await rollup({
        input: inputs,
        treeshake: true,

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
          url({
            include: [
              "**/*.jpg",
              "**/*.jpeg",
              "**/*.png",
              "**/*.gif",
              "**/*.webp",
              "**/*.svg",
              "**/*.ico",
              "**/*.woff",
              "**/*.woff2",
              "**/*.ttf",
              "**/*.eot",
              "**/*.css",
            ],
            limit: 0,
            fileName: "assets/[name]-[hash][extname]",
            emitFiles: false,
          }),

          XanixEnvPlugin({
            mode: "development",
            isClient: true,
          }),
          nodeResolve({
            browser: true,
            preferBuiltins: false,
            extensions: [".mjs", ".js", ".jsx", ".json", ".ts", ".tsx"],
          }),

          commonjs(),
          json(),

          esbuild({
            include: /\.(?:js|jsx|ts|tsx|mjs|cjs|mts|cts)$/,
            target: "es2022",
            jsx: "automatic",
            tsconfig: false,
            minify: false,
            define: defines({
              mode: "development",
              isClient: true,
            }),
          }),
        ],
      });
      await bundle.write({
        dir: cacheDir,
        format: "esm",
        exports: "auto",
        sourcemap: true,
        entryFileNames: `[name].js`,
      });

      await bundle.close();

      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    },
  };

  return plugins;
};

export default XanixCache;
