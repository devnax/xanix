import path from "node:path";
import { type Plugin, rolldown } from "rolldown";
import { createRequire } from "node:module";
import { tsconfigPathsMatcher } from "../XanixTsconfigAlias.js";
import { esmExternalRequirePlugin } from "rolldown/plugins";
import fs from "node:fs";
import loadEnv from "../../config/loadEnv.js";

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

const build = async ({ id, define }: BuildOptions) => {
  const resolved = require.resolve(id, {
    paths: [process.cwd()],
  });

  // make a cache file first
  const tmpFile = `${makeFilename(id)}.temp.js`;
  const cacheFile = path.join(cacheDir, tmpFile);
  // make sure the cache directory exists
  fs.mkdirSync(cacheDir, { recursive: true });
  fs.writeFileSync(
    cacheFile,
    `
      import * as __mod from "${id}";
      export default __mod;
    `,
  );

  const filename = makeFilename(id);
  const barePackagePattern = /^(?![./]|[A-Za-z]:[\\/])[^:]+$/;

  const bundle = await rolldown({
    input: resolved,
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
      esmExternalRequirePlugin({
        external: [barePackagePattern, /^node:/],
      }),
      {
        name: "XanixResolveCacheDeps",
        async resolveId(_id) {
          console.log(_id);

          if (_id.startsWith(".") || path.isAbsolute(_id)) {
            return null;
          }

          if (id === _id) {
            return null;
          }

          return {
            id: `${id}.internal.js`,
            external: true,
          };

          return null;
        },
      },
    ],
  });

  await bundle.write({
    file: path.join(cacheDir, `${filename}.js`),
    format: "esm",
    exports: "auto",
    sourcemap: true,
    codeSplitting: false,
    polyfillRequire: false,
    entryFileNames: `${filename}.js`,
    chunkFileNames: `${filename}-[hash].js`,
    assetFileNames: `${filename}-[hash][extname]`,
  });

  await bundle.close();

  const cache = {
    file: path.join(cacheDir, `${filename}.js`),
    filename: `${filename}.js`,
    id,
  };

  let namedExports: string[] = [];
  let hasDefault = false;

  // try {
  //   const mod = await import(pathToFileURL(cache.file).href);
  //   hasDefault =
  //     mod &&
  //     (typeof mod === "object" || typeof mod === "function") &&
  //     "default" in mod;
  //   namedExports = Object.keys(mod).filter(
  //     (key) => key !== "__esModule" && key !== "default",
  //   );
  // } catch (err) {
  //   console.warn(`[cache-deps] failed to inspect ${id}:`, err);
  // }

  // const lines = [`import * as __mod from "./${id}.internal.js"`];
  // lines.push(
  //   hasDefault ? `export default __mod.default;` : `export default __mod;`,
  // );

  // for (const exportName of namedExports) {
  //   if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(exportName)) {
  //     lines.push(
  //       `export const ${exportName} = __mod[${JSON.stringify(exportName)}];`,
  //     );
  //   }
  // }

  // const reExportFile = path.join(cacheDir, `${filename}.js`);
  // fs.writeFileSync(reExportFile, lines.join("\n"));
  cached.set(id, cache);

  return cache;
};

const XanixCache = ({
  cacheDir = "./.xanix/cache",
  define,
}: XanixCacheOptions): Plugin => {
  return {
    name: "XanixCache",
    async resolveId(id) {
      if (
        id.startsWith(".") ||
        path.isAbsolute(id) ||
        id === "virtual:xanix-document" ||
        tsconfigPathsMatcher(id)
      ) {
        return null;
      }
      if (cached.has(id)) {
        return {
          id: id,
          external: true,
        };
      }

      const info = await build({
        id,
        define,
      });

      return {
        id: id,
        external: true,
      };
    },
  };
};

export default XanixCache;
