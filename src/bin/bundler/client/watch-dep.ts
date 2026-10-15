import { watch, type RolldownWatcher } from "rolldown";
import ClientWatchConfig from "./watch.config.js";
import { getManifest } from "../../include/manifest.js";
import { frameworkDir, normalizePath } from "../../include/utils.js";
import XanixCache from "../cache/index.js";
import { XanixClientEntry } from "../../types.js";
import xanixAssets from "../../plugins/XanixAssets.js";
import xanixTsconfigAlias from "../../plugins/XanixTsconfigAlias.js";
import xanixDocument from "../../plugins/XanixDocument.js";
import XanixTransformer from "./plugins/Transformer.js";
import XanixPages from "./plugins/XanixPages.js";
import path from "node:path";

type Option = {
  onStart?: () => Promise<void>;
  onChange?: (
    files: string[],
    duration: number,
    moduleToChunk: Map<string, string>,
    assets: Map<string, { type: string; path: string; name: string }>,
  ) => Promise<void>;
  onReady?: (duration: number, entries: XanixClientEntry[]) => Promise<void>;
};

const WatchClient = async (options: Option): Promise<RolldownWatcher> => {
  const entries = await getManifest();
  const config = await ClientWatchConfig();
  const changedFiles = new Set<string>();
  const moduleToChunk = new Map<string, string>();
  const assets = new Map<
    string,
    { type: string; path: string; name: string }
  >();

  let isReady = false;
  let start = 0;

  const watcher = watch({
    ...config,
    input: path.join(frameworkDir, "dist/client-runtime.js"),
    plugins: [
      XanixCache(),
      XanixTransformer(),
      xanixAssets(assets),
      xanixTsconfigAlias(),
      xanixDocument(),
      XanixPages(),

      {
        name: "xanix-client",
        async watchChange(id) {
          changedFiles.add(normalizePath(id));
        },
        async buildStart() {
          await options.onStart?.();
          start = performance.now();
        },
        async generateBundle(_options: any, bundle: any) {
          moduleToChunk.clear();
          for (const output of Object.values(bundle) as any[]) {
            if (output.type !== "chunk") continue;
            for (const id of Object.keys(output.modules)) {
              moduleToChunk.set(normalizePath(id), output.fileName);
            }
          }
          const duration = parseInt((performance.now() - start).toFixed(2));
          if (!isReady) {
            await options.onReady?.(duration, entries);
            isReady = true;
          } else {
            await options.onChange?.(
              Array.from(changedFiles),
              duration,
              moduleToChunk,
              assets,
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
