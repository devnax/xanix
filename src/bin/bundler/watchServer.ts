import { watch } from "rollup";
import XanixAssets from "./plugins/XanixAssets/index.js";
import path from "node:path";
import fs from "node:fs";
import { XanixTransform } from "./plugins/XanixTransform/index.js";
import { createManifest } from "../include/manifest.js";
import { XanixClientEntry } from "../types.js";
import generateClientEntries from "./generateClientEntries.js";
import rollupEsbuild from "./plugins/rollupEsbuild.js";
import rollupNodeResolve from "./plugins/nodeResolve.js";
import rollupCommonjs from "./plugins/commonjs.js";
import bundlerOutput, { outDir } from "./config/output.js";
import XanixWatchChange from "./plugins/XanixWatchChange.js";
import { getDocumentFile } from "../include/utils.js";

const root = process.cwd();

export type WatcherOptions = {
  rootEntry: string;
  onChange?: (
    id: string,
    event: "update" | "delete" | "create" | undefined,
  ) => Promise<void>;
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
  fs.rmSync(outDir.server, {
    recursive: true,
    force: true,
  });

  fs.mkdirSync(outDir.server, {
    recursive: true,
  });

  const entries = await generateClientEntries();
  await createManifest(entries);

  const input = {
    index: path.resolve(root, rootEntry),
    "xanix-document": await getDocumentFile(),
  };

  const watcher = watch({
    input,

    plugins: [
      XanixWatchChange(entries, {
        onClientEntryChange,
        onServerChange,
        onChange,
      }),
      XanixAssets({
        external: false,
      }),
      XanixTransform({
        mode: "watch",
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
