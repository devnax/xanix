import { watch } from "rolldown";
import path from "node:path";
import fs from "node:fs";
import type { WatcherOptions } from "./types.js";
import { normalizePath } from "../../include/utils.js";
import outdirs from "../../../outdirs.js";
import ServerConfig from "./watch.config.js";
import XanixUseServer from "../../plugins/XanixUseServer.js";
import xanixDocument from "../../plugins/XanixDocument/index.js";
import xanixTsconfigAlias from "../../plugins/XanixTsconfigAlias.js";
import xanixAssets from "../../plugins/XanixAssets.js";
import XanixTransformer from "./plugins/Transformer.js";

const root = process.cwd();

const watchServer = async ({
  rootEntry,
  onChange,
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
      XanixUseServer({ isClient: false }),
      XanixTransformer(),

      {
        name: "noop",
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

  watcher.on("change", async (id) => {
    // changedFiles.add(normalizePath(id));
  });

  watcher.on("event", async (event) => {
    switch (event.code) {
      // case "BUNDLE_END": {
      //   duration = event.duration;
      //   onBuildEnd?.(event.duration);
      //   break;
      // }

      case "END": {
        // if (changedFiles.size) {
        //   if (entries.length) {
        //     const clientEntries = Array.from(entries);

        //     for (const entry of changedFiles) {
        //       const isClientEntry = clientEntries.find((e) => e.file === entry);
        //       if (!isClientEntry) {
        //         const currentEntries = await getEntries();
        //         const isEqual = await entriesEqual(currentEntries);
        //         if (!isEqual) {
        //           await onClientEntryChange?.(entry, currentEntries);
        //         }
        //       }
        //     }
        //   }

        //   await onChange?.(
        //     Array.from(changedFiles).map((file) =>
        //       file.replace(normalizePath(root), ""),
        //     ),
        //     duration,
        //   );

        //   changedFiles.clear();
        // }

        // if (!isReady) {
        //   isReady = true;
        //   await onReady?.(entries);
        // }

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
