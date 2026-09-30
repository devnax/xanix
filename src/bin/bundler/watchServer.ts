import { watch } from "rolldown";
import path from "node:path";
import fs from "node:fs";
import { getEntries } from "../include/manifest.js";
import { XanixClientEntry } from "../types.js";
import bundlerOutput from "./config/output.js";
import { entriesEqual } from "../include/entry.js";
import { xanixDefaultPlugins } from "./plugins/plugins.js";
import outdirs from "../../outdirs.js";
import { normalizePath } from "../include/utils.js";
import loadEnv from "./config/loadEnv.js";
import { builtinModules } from "node:module";
import { tsconfigPathsMatcher } from "./plugins/XanixTsconfigAlias.js";
import XanixTransform from "./plugins/TransformServer/index.js";
import { ResolverFactory } from "rolldown/experimental";

const resolver = new ResolverFactory();
const root = process.cwd();
const nodeBuiltins = new Set(builtinModules);

function isNodeBuiltin(id: string): boolean {
  const normalized = id.startsWith("node:") ? id.slice(5) : id;
  return nodeBuiltins.has(normalized);
}

export type WatcherOptions = {
  rootEntry: string;
  onChange?: (files: string[], duration: number) => Promise<void>;
  onBuildEnd?: (duration: number) => void;
  onClientEntryChange: (
    id: string,
    entries: XanixClientEntry[],
  ) => Promise<void>;
  onReady?: (entries: XanixClientEntry[]) => Promise<void>;
};

const watchServer = async ({
  rootEntry,
  onChange,
  onBuildEnd,
  onClientEntryChange,
  onReady,
}: WatcherOptions) => {
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

  const watcher = watch({
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

    plugins: [
      XanixTransform(),

      ...xanixDefaultPlugins({
        target: "server",
        development: true,
        assetExternal: false,
      }),
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

    output: bundlerOutput.server({
      isDev: true,
    }),

    watch: {
      clearScreen: false,
    },
  });

  let isReady = false;

  const changedFiles = new Set<string>();

  watcher.on("change", async (id) => {
    changedFiles.add(normalizePath(id));
  });

  let duration = 0;

  watcher.on("event", async (event) => {
    switch (event.code) {
      case "BUNDLE_END": {
        duration = event.duration;

        onBuildEnd?.(event.duration);

        break;
      }

      case "END": {
        const entries = await getEntries();

        if (changedFiles.size) {
          if (entries.length) {
            const clientEntries = Array.from(entries);

            for (const entry of changedFiles) {
              const isClientEntry = clientEntries.find((e) => e.file === entry);
              if (!isClientEntry) {
                const currentEntries = await getEntries();
                const isEqual = await entriesEqual(currentEntries);
                if (!isEqual) {
                  await onClientEntryChange?.(entry, currentEntries);
                }
              }
            }
          }

          await onChange?.(
            Array.from(changedFiles).map((file) =>
              file.replace(normalizePath(root), ""),
            ),
            duration,
          );

          changedFiles.clear();
        }

        if (!isReady) {
          isReady = true;
          await onReady?.(entries);
        }

        break;
      }

      case "ERROR": {
        console.error("[server]", event.error);
        break;
      }
    }
  });

  return watcher;
};

export default watchServer;
