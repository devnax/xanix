import {
  rolldown,
  watch,
  type InputOption,
  type RolldownWatcher,
} from "rolldown";
import ClientWatchConfig from "./watch.config.js";
import fs from "node:fs";
import { getManifest } from "../../include/manifest.js";
import {
  getClientRuntimeFile,
  getClientRuntimeFileName,
  normalizePath,
} from "../../include/utils.js";
import outdirs from "../../../outdirs.js";
import XanixCache from "../cache/index.js";
import { XanixClientEntry } from "../../types.js";
import xanixAssets from "../../plugins/XanixAssets.js";
import xanixTsconfigAlias from "../../plugins/XanixTsconfigAlias.js";
import xanixDocument from "../../plugins/XanixDocument.js";
import XanixTransformer from "./plugins/Transformer.js";

type Option = {
  onStart?: () => Promise<void>;
  onChange?: (
    files: string[],
    duration: number,
    entries: XanixClientEntry[],
  ) => Promise<void>;
  onReady?: (duration: number) => Promise<void>;
};

const WatchClient = async (options: Option): Promise<RolldownWatcher> => {
  const entries = await getManifest();

  const input: InputOption = {};
  for (const entry of entries) {
    input[entry.name] = entry.resolved;
  }
  const runtimeFileName = getClientRuntimeFileName("development");
  input[runtimeFileName] = getClientRuntimeFile();

  const config = await ClientWatchConfig(true);
  const changedFiles = new Set<string>();

  let isReady = false;
  let start = 0;

  const watcher = watch({
    ...config,
    input,
    plugins: [
      XanixCache(),
      XanixTransformer(),

      xanixAssets({
        emit: false,
      }),
      xanixTsconfigAlias(),
      xanixDocument(),

      {
        name: "noop",
        async watchChange(id) {
          changedFiles.add(normalizePath(id));
        },
        async buildStart() {
          await options.onStart?.();
          start = performance.now();
        },
        async generateBundle() {
          const duration = parseInt((performance.now() - start).toFixed(2));
          if (!isReady) {
            await options.onReady?.(duration);
            isReady = true;
          } else {
            await options.onChange?.(
              Array.from(changedFiles),
              duration,
              entries,
            );
          }

          changedFiles.clear();
        },
      },
    ],
  });

  watcher.on("event", (event) => {
    if (event.code === "ERROR") {
      console.error("Build error:", event.error);
    }
    // if (event.code === "BUNDLE_END") {
    //   console.log(event.duration);
    // }
  });

  return watcher;
};

export default WatchClient;
