import { watch, type InputOption, type RollupWatcher } from "rollup";
import bundlerOutput, { outDir } from "./config/output.js";
import fs from "node:fs";
import { createRequire } from "node:module";
import { XanixClientEntry } from "../types.js";
import BuildCache from "./cacheNpmModules.js";
import XanixResolveCacheDeps from "./plugins/XanixResolveCacheDeps/index.js";
import xanixReactRefresh from "./plugins/XanixReactRefresh.js";
import { getDocumentFile } from "../include/utils.js";
import { xanixDefaultPlugins } from "./plugins/plugins.js";

const require = createRequire(import.meta.url);

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

  input["xanix-runtime"] = require.resolve("xanix/runtime");
  input["xanix-document"] = await getDocumentFile();

  fs.rmSync(outDir.client, {
    recursive: true,
    force: true,
  });

  fs.mkdirSync(outDir.client, {
    recursive: true,
  });
  const buildCache = await BuildCache(entries);
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
