import { watch, type InputOption, type RollupWatcher } from "rollup";
import bundlerOutput, { outDir } from "./config/output.js";
import fs from "node:fs";
import { XanixClientEntry } from "../types.js";
import BuildCache from "./cacheNpmModules.js";
import XanixResolveCacheDeps from "./plugins/XanixResolveCacheDeps/index.js";
import {
  getClientRuntimeFile,
  getClientRuntimeFileName,
} from "../include/utils.js";
import { xanixDefaultPlugins } from "./plugins/plugins.js";

type Option = {
  onChange?: (entry: string, event?: string) => void;
  onBuildEnd?: () => void;
};

const WatchClient = async (
  entries: XanixClientEntry[],
  options: Option,
): Promise<RollupWatcher> => {
  const input: InputOption = {};

  for (const entry of entries) {
    input[entry.name] = entry.file;
  }
  const runtimeFileName = getClientRuntimeFileName("development");
  input[runtimeFileName] = getClientRuntimeFile();

  fs.rmSync(outDir.client, {
    recursive: true,
    force: true,
  });

  fs.mkdirSync(outDir.client, {
    recursive: true,
  });

  let buildCache: Map<string, any>;
  if (entries.length > 0) {
    buildCache = await BuildCache(entries);
  } else {
    buildCache = new Map();
  }
  const watcher = watch({
    input,
    treeshake: true,
    plugins: [
      XanixResolveCacheDeps(buildCache, entries),
      ...xanixDefaultPlugins({
        target: "client",
        development: true,
        assetExternal: true,
        onChange: options.onChange,
      }),
    ],
    output: bundlerOutput.client(entries, { isDev: true }),
    watch: {
      clearScreen: false,
    },
  });

  watcher.on("event", (event) => {
    switch (event.code) {
      case "BUNDLE_START":
        break;
      case "BUNDLE_END":
        options.onBuildEnd?.();
        break;

      case "ERROR":
        console.error("[client]", event.error);
        break;
    }
  });

  return watcher;
};

export default WatchClient;
