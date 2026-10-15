import { WatchOptions } from "rolldown";
import vuePlugin from "../plugins/VueTransform.js";
import ReactRefresh from "../plugins/ReactRefresh.js";
import loadEnv from "../../include/loadEnv.js";
import XanixPages from "../plugins/XanixPages.js";
import xanixDocument from "../../include/plugins/XanixDocument.js";
import xanixTsconfigAlias from "../../include/plugins/XanixTsconfigAlias.js";
import XanixCache from "../cache/index.js";
import XanixTransformer from "../plugins/Transformer.js";
import xanixAssets from "../../include/plugins/XanixAssets.js";
import path from "node:path";
import { fileURLToPath } from "node:url";
import RegisterRoute from "../plugins/RegisterRoute.js";
import outdirs from "../../include/outdirs.js";
import SvelteTransform from "../plugins/SveletTransform.js";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ClientWatchConfig = async (): Promise<WatchOptions> => {
  const env = await loadEnv({
    mode: "development",
    isClient: true,
  });
  return {
    input: path.resolve(__dirname, "../entry.js"),
    plugins: [
      ReactRefresh({ isDev: true }),
      vuePlugin({ ssr: false }),
      SvelteTransform({ generate: "client" }),
      RegisterRoute(),
      XanixTransformer(),
      xanixAssets(),
      xanixTsconfigAlias(),
      xanixDocument(),
      XanixPages(),
      XanixCache(),
    ],
    output: {
      dir: outdirs.client,
      format: "esm",
      sourcemap: true,
      preserveModules: false,
      chunkFileNames: (id) => {
        if (id.name === "page" || id.name === "props" || id.name === "layout") {
          let name = id.facadeModuleId!.replace(
            process.cwd() + path.sep + "app",
            "",
          );
          const ext = path.extname(name);
          if (ext) {
            name = name.slice(0, -ext.length);
          }
          return `pages/${name}.js`;
        }
        return `vendor/[name].js`;
      },
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
      define: env,
    },
    watch: {
      clearScreen: false,
    },
  };
};

export default ClientWatchConfig;
