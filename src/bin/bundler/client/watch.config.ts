import { WatchOptions } from "rolldown";
import loadEnv from "../../include/loadEnv.js";
import outdirs from "../../../outdirs.js";
import { getManifest } from "../../include/manifest.js";

const ClientWatchConfig = async (isDev = false): Promise<WatchOptions> => {
  const entries = await getManifest();
  const _entries: any = {};
  for (const entry of entries) {
    _entries[entry.name] = entry;
  }
  return {
    output: {
      dir: outdirs.client,
      format: "esm",
      sourcemap: isDev,
      preserveModules: isDev,
      preserveModulesRoot: process.cwd(),
      chunkFileNames: "chunks/[hash].js",
      assetFileNames: "assets/[name][extname]",
      entryFileNames: (id: any) => {
        const entry = _entries[id.name];
        if (entry) {
          return `${entry.id}.js`;
        }

        return `[name].js`;
      },
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
