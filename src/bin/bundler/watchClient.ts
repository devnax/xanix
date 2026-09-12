import { watch, type InputOption, type RollupWatcher } from "rollup";
import bundlerOutput from "./config/output.js";
import fs from "node:fs";
import { XanixClientEntry } from "../types.js";
import BuildClientCache from "./plugins/XanixResolveCacheDeps/BuildClientCache.js";
import XanixResolveCacheDeps from "./plugins/XanixResolveCacheDeps/index.js";
import {
  getClientRuntimeFile,
  getClientRuntimeFileName,
  normalizePath,
} from "../include/utils.js";
import { xanixDefaultPlugins } from "./plugins/plugins.js";
import outdirs from "../../outdirs.js";
import XanixCachedDeps from "./plugins/XanixCacheDeps.js";
import XanixCache from "./Cache.js";
// import XanixCachedDeps from "./plugins/XanixCachedDeps.js";

type Option = {
  onChange?: (files: string[]) => void;
  onBuildEnd?: (duration: number) => void;
  onReady?: () => Promise<void>;
  onCachedStart?: () => void;
  onCachedEnd?: () => void;
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

  // options.onCachedStart?.();
  // let clientCache = await BuildClientCache(entries);
  // options.onCachedEnd?.();

  const watcher = watch({
    input,
    treeshake: true,
    plugins: [
      // vendorRedirectPlugin(map),
      // XanixResolveCacheDeps(clientCache, entries),
      // XanixCache({
      //   cacheDir: "./.xanix/cache",
      //   define: {},
      // }),
      ...xanixDefaultPlugins({
        WebSocketPort: options.WebSocketPort,
        target: "client",
        development: true,
        assetExternal: true,
      }),
      // XanixCachedDeps(),
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
        console.log(event.duration);

        options.onBuildEnd?.(event.duration);
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
