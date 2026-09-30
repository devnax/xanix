import { rolldown } from "rolldown";
import type { CachedModule } from "./types.js";
import loadEnv from "../config/loadEnv.js";

const buildCache = async (cached: Map<string, CachedModule>) => {
  const input: any = {};

  for (let [source, { name }] of cached) {
    input[name] = source;
  }

  const build = await rolldown({
    input,
    treeshake: true,
    platform: "node",
    tsconfig: true,
    checks: {
      moduleLevelDirective: false,
    },
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
  });

  await build.write({
    dir: ".xanix/cache",
    format: "es",
    entryFileNames: "[name].js",
  });

  await build.close();
};
export default buildCache;
