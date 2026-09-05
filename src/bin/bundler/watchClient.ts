import { watch, type InputOption, type RollupWatcher } from "rollup";
import bundlerOutput from "./config/output.js";
import fs from "node:fs";
import { XanixClientEntry } from "../types.js";
import BuildCache from "./cacheNpmModules.js";
import XanixResolveCacheDeps from "./plugins/XanixResolveCacheDeps/index.js";
import {
  getClientRuntimeFile,
  getClientRuntimeFileName,
  normalizePath,
} from "../include/utils.js";
import { xanixDefaultPlugins } from "./plugins/plugins.js";
import outdirs from "../../outdirs.js";

type Option = {
  onChange?: (files: string[]) => void;
  onBuildEnd?: () => void;
  onReady?: () => Promise<void>;
  WebSocketPort: number;
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

  fs.rmSync(outdirs.client, {
    recursive: true,
    force: true,
  });

  fs.mkdirSync(outdirs.client, {
    recursive: true,
  });

  let buildCache: Map<string, any> = new Map();
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
        WebSocketPort: options.WebSocketPort,
        target: "client",
        development: true,
        assetExternal: true,
      }),
    ],
    output: bundlerOutput.client(entries, { isDev: true }),
    watch: {
      clearScreen: false,
    },
  });

  let isReady = false;

  const changedFiles = new Set<string>();

  watcher.on("change", (entry) => {
    entry = normalizePath(entry);
    const root = process.cwd();
    const _entry = entries.find((e) => e.file === entry);
    // if (_entry) {
    //   entry = _entry.file;
    // }

    // entry = entry.replace(normalizePath(root), "");

    let buildFile = _entry
      ? `${_entry.id}.js`
      : entry
          .replace(normalizePath(root), "")
          .replace(/\.(ts|tsx|jsx)$/, ".js")
          .replace(/^\\/, "");
    changedFiles.add(buildFile);
  });

  watcher.on("event", async (event) => {
    switch (event.code) {
      case "BUNDLE_START":
        break;
      case "BUNDLE_END":
        options.onBuildEnd?.();
        break;
      case "END":
        if (changedFiles.size && options.onChange) {
          options.onChange(Array.from(changedFiles));
          changedFiles.clear();
        }
        if (!isReady) {
          isReady = true;
          await options.onReady?.();
        }
        break;

      case "ERROR":
        console.error("[client]", event.error);
        break;
    }
  });

  return watcher;
};

export default WatchClient;
