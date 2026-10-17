import path from "node:path";
import { tsconfigPathsMatcher } from "../include/plugins/XanixTsconfigAlias.js";
import { ResolverFactory } from "rolldown/experimental";
import { builtinModules } from "node:module";
import { WatchOptions } from "rolldown";
import outdirs from "../include/outdirs.js";
import XanixTransformer from "./plugins/Transformer.js";
import xanixDocument from "../include/plugins/XanixDocument.js";
import xanixAssets from "../include/plugins/XanixAssets.js";
import RegisterRoute from "./plugins/RegisterRoute.js";
import loadEnv from "../include/loadEnv.js";
import SvelteTransform from "../include/plugins/SveletTransform.js";
import VueTransform from "../include/plugins/VueTransform.js";

const resolver = new ResolverFactory();
const nodeBuiltins = new Set(builtinModules);

function isNodeBuiltin(id: string): boolean {
  const normalized = id.startsWith("node:") ? id.slice(5) : id;
  return nodeBuiltins.has(normalized);
}

const ServerWatchConfig = async (isDev = true): Promise<WatchOptions> => {
  const root = process.cwd();

  const input = {
    index: path.resolve(root, "index.tsx"),
  };
  return {
    input,
    plugins: [
      VueTransform({ ssr: true }),
      SvelteTransform({ ssr: true, dev: true }),
      xanixAssets(),
      xanixDocument(),
      RegisterRoute(),
      // xanixTsconfigAlias(),
      XanixTransformer({}),
    ],
    output: {
      dir: outdirs.server,
      format: "esm",
      sourcemap: isDev,
      entryFileNames: "index.js",
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
    },
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
        mode: isDev ? "development" : "production",
        isClient: false,
      }),
    },

    watch: {
      clearScreen: false,
    },

    external(id, parent) {
      if (
        id.startsWith(".") ||
        path.isAbsolute(id) ||
        id.startsWith("xanix") ||
        id === "virtual:xanix-document" ||
        id === "virtual:xanix-route" ||
        tsconfigPathsMatcher(id)
      ) {
        return false;
      }

      if (isNodeBuiltin(id)) {
        return true;
      }

      if (parent) {
        const resolve = resolver.sync(path.dirname(parent), id);
        if (resolve.path) {
          const ext = path.extname(resolve.path);
          const valid = [".js", ".cjs", ".mjs"];
          if (!valid.includes(ext)) {
            return false;
          }
        }
      }

      return true;
    },
  };
};

export default ServerWatchConfig;
