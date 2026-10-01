import { watch, type InputOption, type RolldownWatcher } from "rolldown";
import ClientWatchConfig from "./watch.config.js";
import fs from "node:fs";
import { XanixClientEntry } from "../../types.js";
import {
  getClientRuntimeFile,
  getClientRuntimeFileName,
  normalizePath,
} from "../../include/utils.js";
import { xanixDefaultPlugins } from "../../plugins/plugins.js";
import outdirs from "../../../outdirs.js";
import XanixCache from "../cache/index.js";

type Option = {
  onChange?: (files: string[], duration: number) => void;
  onBuildEnd?: (duration: number) => void;
  onReady?: () => Promise<void>;
  onCachedStart?: () => void;
  onCachedEnd?: () => void;
  WebSocketPort: number;
};

const WatchClient = async (
  entries: XanixClientEntry[],
  options: Option,
): Promise<RolldownWatcher> => {
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

  const config = await ClientWatchConfig();
  const watcher = watch({
    ...config,
    input,

    plugins: [
      XanixCache(),
      ...xanixDefaultPlugins({
        WebSocketPort: options.WebSocketPort,
        target: "client",
        development: true,
        assetExternal: true,
      }),
    ],
  });

  let isReady = false;

  const changedFiles = new Set<string>();

  watcher.on("change", (entry) => {
    entry = normalizePath(entry);
    const root = process.cwd();
    const _entry = entries.find((e) => e.file === entry);
    let buildFile = _entry
      ? `${_entry.id}.js`
      : entry
          .replace(normalizePath(root), "")
          .replace(/\.(ts|tsx|jsx)$/, ".js")
          .replace(/^\\/, "");

    changedFiles.add(buildFile);
  });

  let duration = 0;
  watcher.on("event", async (event) => {
    switch (event.code) {
      case "BUNDLE_START":
        break;
      case "BUNDLE_END":
        duration = event.duration;
        options.onBuildEnd?.(event.duration);
        break;
      case "END":
        if (changedFiles.size && options.onChange) {
          options.onChange(Array.from(changedFiles), duration);
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
