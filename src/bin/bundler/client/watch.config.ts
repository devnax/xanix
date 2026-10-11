import { WatchOptions } from "rolldown";
import loadEnv from "../../include/loadEnv.js";
import outdirs from "../../../outdirs.js";

const ClientWatchConfig = async (isDev = false): Promise<WatchOptions> => {
  return {
    output: {
      dir: outdirs.client,
      format: "esm",
      sourcemap: isDev,
      preserveModules: false,
      chunkFileNames: isDev ? "chunks/[name].js" : "chunks/[hash]c.js",
      assetFileNames: "assets/[name][extname]",
      entryFileNames: "runtime.js",
    },
    treeshake: true,
    tsconfig: true,
    checks: {
      moduleLevelDirective: false,
    },
    resolve: {
      extensions: [".mjs", ".js", ".jsx", ".json", ".ts", ".tsx"],
      conditionNames: ["browser", "import", "module", "default"],
    },
    transform: {
      target: "es2022",
      jsx: {
        runtime: "automatic",
        refresh: true,
      },
      define: await loadEnv({
        mode: isDev ? "development" : "production",
        isClient: true,
      }),
    },
    watch: {
      clearScreen: false,
    },
  };
};

export default ClientWatchConfig;
