import { watch } from "rolldown";
import path from "node:path";
import { normalizePath } from "../../include/utils.js";
import ServerConfig from "./watch.config.js";
import xanixDocument from "../../plugins/XanixDocument.js";
import xanixTsconfigAlias from "../../plugins/XanixTsconfigAlias.js";
import xanixAssets from "../../plugins/XanixAssets.js";
import XanixTransformer from "./plugins/Transformer.js";
import { XanixClientEntry } from "../../types.js";

export type WatcherOptions = {
  rootEntry: string;
  onChange: (files: string[], duration: number) => Promise<void>;
  onReady: (duration: number) => Promise<void>;
  onChangeManifest: (
    entries: XanixClientEntry[],
    type: "add" | "remove",
  ) => Promise<void>;
};
const root = process.cwd();

const watchServer = async ({
  rootEntry,
  onChange,
  onReady,
  onChangeManifest,
}: WatcherOptions) => {
  const input = {
    index: path.resolve(root, rootEntry),
  };

  const config = await ServerConfig();
  const changedFiles = new Set<string>();

  let isReady = false;
  let start = 0;

  const watcher = watch({
    ...config,
    input,
    plugins: [
      xanixDocument(),
      xanixAssets({
        emit: true,
      }),
      xanixTsconfigAlias(),
      XanixTransformer({
        onChangeManifest: async (
          newEntries: XanixClientEntry[],
          type: "add" | "remove",
        ) => {
          isReady && (await onChangeManifest?.(newEntries, type));
        },
      }),

      {
        name: "xanix-server",
        async watchChange(id) {
          changedFiles.add(normalizePath(id));
        },
        async buildStart() {
          start = performance.now();
        },
        async generateBundle() {
          const duration = parseInt((performance.now() - start).toFixed(2));
          if (!isReady) {
            await onReady?.(duration);
            isReady = true;
          } else {
            await onChange?.(Array.from(changedFiles), duration);
          }

          changedFiles.clear();
        },
      },
    ],
  });
  watcher.on("event", (event) => {
    if (event.code === "ERROR") {
      console.error("Build error:", event.error);
    }
  });
  return watcher;
};

export default watchServer;
