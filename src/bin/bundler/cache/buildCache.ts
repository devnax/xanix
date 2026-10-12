import { rolldown } from "rolldown";
import type { CachedModule } from "./types.js";
import loadEnv from "../../include/loadEnv.js";
import outdirs from "../../../outdirs.js";

const VIRTUAL_PREFIX = "\0xanix-cache:";

const buildCache = async (cached: Map<string, CachedModule>) => {
  const input: Record<string, string> = {};

  for (const [, { name }] of cached) {
    input[name] = `${VIRTUAL_PREFIX}${name}`;
  }

  const build = await rolldown({
    input,
    treeshake: true,
    platform: "browser",
    tsconfig: true,
    checks: {
      moduleLevelDirective: false,
    },
    resolve: {
      extensions: [".mjs", ".js", ".jsx", ".json", ".ts", ".tsx"],
      conditionNames: ["browser", "import", "module", "default"],
    },

    transform: {
      target: "es2020",
      jsx: {
        runtime: "automatic",
      },
      define: await loadEnv({
        mode: "development",
        isClient: false,
      }),
    },

    plugins: [
      {
        name: "CacheEntry",
        resolveId(source) {
          if (source.startsWith(VIRTUAL_PREFIX)) {
            return source;
          }
          return null;
        },

        load(id) {
          if (!id.startsWith(VIRTUAL_PREFIX)) {
            return null;
          }
          const name = id.slice(VIRTUAL_PREFIX.length);
          const cache: any = [...cached.values()].find(
            (item) => item.name === name,
          );
          if (!cache) {
            return null;
          }
          const resolved = cache.resolved || cache.module;

          if (cache.default) {
            return `
import * as __xmod from ${JSON.stringify(resolved)};
export default __xmod.default;
export { __xmod };
`;
          }

          return `
import * as __xmod from ${JSON.stringify(resolved)};
export default __xmod;
export { __xmod };
`;
        },
      },
    ],
  });

  await build.write({
    dir: outdirs.module_cache,
    format: "es",
    entryFileNames: "[name].js",
  });

  await build.close();
};

export default buildCache;
