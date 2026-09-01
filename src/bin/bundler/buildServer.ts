import { rollup } from "rollup";
import path from "node:path";
import bundlerOutput, { outDir } from "./config/output.js";
import fs from "node:fs";
import { createManifest } from "../include/manifest.js";
import { XanixClientEntry } from "../types.js";
import generateClientEntries from "./generateClientEntries.js";
import { xanixDefaultPlugins } from "./plugins/plugins.js";

const root = process.cwd();

export type WatcherOptions = {
  rootEntry: string;
  onBuildEnd: (entries: XanixClientEntry[]) => Promise<void>;
};

const BuildServer = async ({ rootEntry, onBuildEnd }: WatcherOptions) => {
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
  };

  const build = await rollup({
    input,
    treeshake: true,
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
      ...xanixDefaultPlugins({
        target: "server",
        development: false,
        assetExternal: false,
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
  });

  await build.write(bundlerOutput.server({ isDev: false }));

  await build.close();
  await onBuildEnd(entries);
};

export default BuildServer;
