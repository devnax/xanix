import {
  rolldown,
  watch,
  type InputOption,
  type RolldownWatcher,
} from "rolldown";
import bundlerOutput from "./config/output.js";
import fs from "node:fs";
import { XanixClientEntry } from "../types.js";
import {
  getClientRuntimeFile,
  getClientRuntimeFileName,
  normalizePath,
} from "../include/utils.js";
import { xanixDefaultPlugins } from "./plugins/plugins.js";
import outdirs from "../../outdirs.js";
import loadEnv from "./config/loadEnv.js";
import XanixCache from "./plugins/XanixResolveCacheDeps/index.js";
import path from "node:path";
import { tsconfigPathsMatcher } from "./plugins/XanixTsconfigAlias.js";

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

  // options.onCachedStart?.();
  // let clientCache = await BuildClientCache(entries);
  // options.onCachedEnd?.();

  let watchingMode = false;

  const watcher = watch({
    input,
    treeshake: true,
    tsconfig: true,
    resolve: {
      extensions: [".mjs", ".js", ".jsx", ".json", ".ts", ".tsx"],
      conditionNames: ["browser", "import", "module", "default"],
    },
    transform: {
      target: "es2022",
      jsx: {
        runtime: "automatic",
      },
      define: await loadEnv({
        mode: "development",
        isClient: true,
      }),
    },
    plugins: [
      // XanixCache({
      //   cacheDir: ".xanix/cache",
      //   define: await loadEnv({
      //     mode: "development",
      //     isClient: true,
      //   }),

      //   // debug: true,
      // }),

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
