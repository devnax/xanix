import { watch } from "rollup";
import path from "node:path";
import fs from "node:fs";
import { createManifest, readManifest } from "../include/manifest.js";
import { XanixClientEntry } from "../types.js";
import generateClientEntries from "./generateClientEntries.js";
import bundlerOutput from "./config/output.js";
import { entriesEqual } from "../include/entry.js";
import { xanixDefaultPlugins } from "./plugins/plugins.js";
import outdirs from "../../outdirs.js";
const root = process.cwd();

export type WatcherOptions = {
  rootEntry: string;
  onChange?: (id: string) => Promise<void>;
  onBuildEnd?: (entries: XanixClientEntry[]) => Promise<void>;
  onClientEntryChange: (
    id: string,
    entries: XanixClientEntry[],
  ) => Promise<void>;
  onServerChange?: (id: string, entries: XanixClientEntry[]) => Promise<void>;
};

const watchServer = async ({
  rootEntry,
  onChange,
  onBuildEnd,
  onServerChange,
  onClientEntryChange,
}: WatcherOptions) => {
  fs.rmSync(outdirs.server, {
    recursive: true,
    force: true,
  });

  fs.mkdirSync(outdirs.server, {
    recursive: true,
  });

  const entries = await generateClientEntries();
  await createManifest(entries);
  const input = {
    index: path.resolve(root, rootEntry),
  };
  const changedFiles = new Set<string>();
  const watcher = watch({
    input,
    treeshake: true,
    plugins: [
      ...xanixDefaultPlugins({
        target: "server",
        development: true,
        assetExternal: false,
        onChange: (entry) => {
          changedFiles.add(entry);
        },
      }),
    ],

    external(id) {
      if (
        id.startsWith(".") ||
        path.isAbsolute(id) ||
        id === "@" ||
        id.startsWith("@/") ||
        id.startsWith("xanix") ||
        id === "virtual:xanix-document"
      ) {
        return false;
      }
      return true;
    },

    output: bundlerOutput.server({ isDev: true }),
    watch: {
      clearScreen: false,
    },
  });

  watcher.on("event", async (event) => {
    switch (event.code) {
      case "BUNDLE_START":
        break;
      case "BUNDLE_END":
        if (changedFiles.size) {
          const manifest = await readManifest();

          if (manifest) {
            for (const entry of changedFiles) {
              const isClientEntry = Array.from(manifest.entries.values()).find(
                (e) => e.file === entry,
              );

              if (!isClientEntry) {
                const entries = await generateClientEntries();
                const isEqual = await entriesEqual(entries);
                if (!isEqual) {
                  await createManifest(entries);
                  await onClientEntryChange?.(entry, entries);
                }
                await onServerChange?.(entry, entries);
              }
              await onChange?.(entry);
            }
          }
          changedFiles.clear();
        }
        await onBuildEnd?.(entries);
        break;
      case "ERROR":
        console.error("[server]", event.error);
        break;
    }
  });

  return watcher;
};

export default watchServer;
