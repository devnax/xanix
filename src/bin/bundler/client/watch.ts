import { watch, type InputOption, type RolldownWatcher } from "rolldown";
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
import xanixDocument from "../../plugins/XanixDocument/index.js";
import XanixUseServer from "../../plugins/XanixUseServer.js";

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

  fs.rmSync(outdirs.client, {
    recursive: true,
    force: true,
  });

  fs.mkdirSync(outdirs.client, {
    recursive: true,
  });

  const config = await ClientWatchConfig(true);
  const changedFiles = new Set<string>();

  let isReady = false;
  let start = 0;

  const watcher = watch({
    ...config,
    input,

    plugins: [
      // XanixCache(),
      xanixAssets({
        emit: false,
      }),
      xanixTsconfigAlias(),
      xanixDocument(),
      XanixUseServer({ isClient: true }),
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

  // watcher.on("change", (entry) => {
  //   entry = normalizePath(entry);
  //   const root = process.cwd();
  //   const _entry = entries.find((e) => e.file === entry);
  //   let buildFile = _entry
  //     ? `${_entry.id}.js`
  //     : entry
  //         .replace(normalizePath(root), "")
  //         .replace(/\.(ts|tsx|jsx)$/, ".js")
  //         .replace(/^\\/, "");

  //   changedFiles.add(buildFile);
  // });

  // let duration = 0;
  // watcher.on("event", async (event) => {
  //   switch (event.code) {
  //     case "BUNDLE_START":
  //       break;
  //     case "BUNDLE_END":
  //       duration = event.duration;
  //       options.onBuildEnd?.(event.duration);
  //       break;
  //     case "END":
  //       if (changedFiles.size && options.onChange) {
  //         options.onChange(Array.from(changedFiles), duration);
  //         changedFiles.clear();
  //       }
  //       if (!isReady) {
  //         isReady = true;
  //         await options.onReady?.();
  //       }
  //       break;

  //     case "ERROR":
  //       console.error("[client]", event.error);
  //       break;
  //   }
  // });

  return watcher;
};

export default WatchClient;
