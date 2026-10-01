import { rolldown } from "rolldown";
import path from "node:path";
import fs from "node:fs";
import { XanixClientEntry } from "../../types.js";
import { getManifest } from "../../include/manifest.js";
import { xanixDefaultPlugins } from "../../plugins/plugins.js";
import outdirs from "../../../outdirs.js";

const root = process.cwd();

export type WatcherOptions = {
  rootEntry: string;
  onBuildEnd: (entries: XanixClientEntry[]) => Promise<void>;
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
      return true;
    },
  });
  const entries = await getManifest();
  // await build.write(bundlerOutput.server({ isDev: false }));
  await build.close();
  // await onBuildEnd(entries);
};

export default BuildServer;
