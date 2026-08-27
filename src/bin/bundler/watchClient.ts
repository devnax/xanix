import { watch, type InputOption, type RollupWatcher } from "rollup";
import bundlerOutput, { outDir } from "./config/output.js";
import XanixAssets from "./plugins/XanixAssets/index.js";
import fs from "node:fs";
import path from "node:path";
import replace from "@rollup/plugin-replace";
import { createRequire } from "node:module";
import { XanixClientEntry } from "../types.js";
import BuildCache from "./buildCache.js";
import XanixResolveCacheDeps from "./plugins/XanixResolveCacheDeps/index.js";
import rollupEsbuild from "./plugins/rollupEsbuild.js";
import rollupNodeResolve from "./plugins/nodeResolve.js";
import rollupCommonjs from "./plugins/commonjs.js";
import xanixReactRefresh from "./plugins/XanixReactRefresh.js";
import { getDocumentFile } from "../include/utils.js";
const require = createRequire(import.meta.url);

type Option = {
  onChange?: (
    entry: string,
    event: "update" | "delete" | "create" | undefined,
  ) => void;
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
    plugins: [
      {
        name: "xanix-watch-client",
        async watchChange(id, change) {
          const entry = path.resolve(id).replaceAll("\\", "/");
          options.onChange?.(entry, change?.event);
        },
      },
      XanixAssets({
        external: true,
      }),
      xanixReactRefresh(),

      XanixResolveCacheDeps(buildCache, entries),
      replace({
        preventAssignment: true,
        "process.env.NODE_ENV": JSON.stringify("development"),
      }),
      rollupNodeResolve(),
      rollupCommonjs(),
      rollupEsbuild({
        sourceMap: true,
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
