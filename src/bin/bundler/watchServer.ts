import { watch } from "rollup";
import XanixAssets from "./plugins/XanixAssets/index.js";
import path from "node:path";
import fs from "node:fs";
import { XanixTransform } from "./plugins/XanixTransform/index.js";
import { createManifest, readManifest } from "../include/manifest.js";
import { XanixClientEntry } from "../types.js";
import generateClientEntries from "./generateClientEntries.js";
import { entriesEqual } from "../include/entry.js";
import rollupEsbuild from "./plugins/rollupEsbuild.js";
import rollupNodeResolve from "./plugins/nodeResolve.js";
import rollupCommonjs from "./plugins/commonjs.js";
import bundlerOutput, { outDir } from "./config/output.js";

const root = process.cwd();

export type WatcherOptions = {
  rootEntry: string;
  onChange?: (
    id: string,
    event: "update" | "delete" | "create" | undefined,
  ) => Promise<void>;
  onBuildEnd?: (entries: XanixClientEntry[]) => Promise<void>;
  onClientChange?: (entries: XanixClientEntry[]) => Promise<void>;
  onClientEntryChange: (entries: XanixClientEntry[]) => Promise<void>;
  onServerChange?: (entries: XanixClientEntry[]) => Promise<void>;
};

const watchServer = async ({
  rootEntry,
  onChange,
  onBuildEnd,
  onClientChange,
  onServerChange,
  onClientEntryChange,
}: WatcherOptions) => {
  fs.rmSync(outDir.server, {
    recursive: true,
    force: true,
  });

  fs.mkdirSync(outDir.server, {
    recursive: true,
  });

  const entries = await generateClientEntries();
  await createManifest(entries);

  const watcher = watch({
    input: path.resolve(root, rootEntry),

    plugins: [
      XanixAssets({
        external: false,
      }),
      XanixTransform({
        mode: "watch",
        onChange: async (entry, change) => {
          const manifest = await readManifest();
          if (!manifest) return;

          const isClientEntry = Array.from(manifest.entries.values()).find(
            (e) => e.file === entry,
          );

          if (!isClientEntry) {
            const entries = await generateClientEntries();
            const isEqual = await entriesEqual(entries);
            if (!isEqual) {
              await createManifest(entries);
              await onClientEntryChange(entries);
            }

            await onServerChange?.(entries);
          } else {
            await onClientChange?.(entries);
          }

          onChange?.(entry, change?.event);
        },
      }),
      rollupNodeResolve(false),
      rollupCommonjs(),
      rollupEsbuild({
        sourceMap: true,
      }),
    ],

    external(id) {
      if (id.startsWith(".") || path.isAbsolute(id)) {
        return false;
      }
      return true;
    },

    output: bundlerOutput.server(),

    watch: {
      clearScreen: false,
    },
  });

  watcher.on("event", async (event) => {
    switch (event.code) {
      case "BUNDLE_START":
        break;

      case "BUNDLE_END":
        // console.log(`[server] built in ${event.duration}ms`);
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
