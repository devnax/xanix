import loadEnv from "../../include/loadEnv.js";
import path from "node:path";
import { tsconfigPathsMatcher } from "../../plugins/XanixTsconfigAlias.js";
import { ResolverFactory } from "rolldown/experimental";
import { builtinModules } from "node:module";
import { WatchOptions } from "rolldown";
import outdirs from "../../../outdirs.js";

const resolver = new ResolverFactory();
const nodeBuiltins = new Set(builtinModules);

function isNodeBuiltin(id: string): boolean {
  const normalized = id.startsWith("node:") ? id.slice(5) : id;
  return nodeBuiltins.has(normalized);
}

const ServerConfig = async (isDev = true): Promise<WatchOptions> => {
  return {
    output: {
      dir: outdirs.server,
      format: "esm",
      sourcemap: isDev,
      entryFileNames: "[name].js",
      chunkFileNames: "chunks/[hash].js",
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

export default ServerConfig;
