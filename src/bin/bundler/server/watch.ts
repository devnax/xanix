import { watch } from "rolldown";
import path from "node:path";
import fs from "node:fs";
import { getEntries } from "../../include/manifest.js";
import type { WatcherOptions } from "./types.js";
import { entriesEqual } from "../../include/entry.js";
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

  const config = await ServerConfig();

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
    ],
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
