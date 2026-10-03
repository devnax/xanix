import { rolldown } from "rolldown";
import path from "node:path";
import fs from "node:fs";
import { XanixClientEntry } from "../../types.js";
import { getManifest } from "../../include/manifest.js";
import outdirs from "../../../outdirs.js";
import XanixTransformer from "./plugins/Transformer.js";
import xanixTsconfigAlias, {
  tsconfigPathsMatcher,
} from "../../plugins/XanixTsconfigAlias.js";
import xanixAssets from "../../plugins/XanixAssets.js";
import xanixDocument from "../../plugins/XanixDocument.js";
import { builtinModules } from "node:module";
import { ResolverFactory } from "rolldown/experimental";
import loadEnv from "../../include/loadEnv.js";
const nodeBuiltins = new Set(builtinModules);

const resolver = new ResolverFactory();
function isNodeBuiltin(id: string): boolean {
  const normalized = id.startsWith("node:") ? id.slice(5) : id;
  return nodeBuiltins.has(normalized);
}
const root = process.cwd();

export type WatcherOptions = {
  rootEntry: string;
  onBuildEnd: () => Promise<void>;
};

const BuildServer = async ({ rootEntry, onBuildEnd }: WatcherOptions) => {
  fs.rmSync(outdirs.server, {
    recursive: true,
    force: true,
  });

  fs.mkdirSync(outdirs.server, {
    recursive: true,
  });

  const input = {
    index: path.resolve(root, rootEntry),
  };

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
        mode: "production",
        isClient: false,
      }),
    },
    onwarn(warning, warn) {
      if (
        warning.code === "MODULE_LEVEL_DIRECTIVE" &&
        warning.message.includes('"use client"')
      ) {
        return;
      }
      warn(warning);
    },
    plugins: [
      xanixDocument(),
      xanixAssets({
        emit: true,
      }),
      xanixTsconfigAlias(),
      XanixTransformer(),
    ],

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
  });
  await build.write({
    dir: outdirs.server,
    format: "esm",
    entryFileNames: "[name].js",
    chunkFileNames: "chunks/[hash].js",
    assetFileNames: "assets/[name][extname]",
    minify: true,
  });
  await build.close();
  await onBuildEnd();
};

export default BuildServer;
