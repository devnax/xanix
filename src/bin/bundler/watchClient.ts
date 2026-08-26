import { watch, type InputOption, type RollupWatcher } from "rollup";
import bundlerOutput, { outDir } from "./config/output.js";
import XanixAssets from "./plugins/XanixAssets/index.js";
import fs from "node:fs";
import replace from "@rollup/plugin-replace";
import { createRequire } from "node:module";
import { XanixClientEntry } from "../types.js";
import BuildCache from "./buildCache.js";
import XanixResolveCacheDeps from "./plugins/XanixResolveCacheDeps/index.js";
import rollupEsbuild from "./plugins/rollupEsbuild.js";
import rollupNodeResolve from "./plugins/nodeResolve.js";
import rollupCommonjs from "./plugins/commonjs.js";
import xanixReactRefresh from "./plugins/XanixReactRefresh.js";
const require = createRequire(import.meta.url);

const WatchClient = async (
  entries: XanixClientEntry[],
): Promise<RollupWatcher> => {
  const input: InputOption = {};

  for (const entry of entries) {
    input[entry.name] = entry.file;
  }

  input["xanix-runtime"] = require.resolve("xanix/runtime");

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
      // add react-refresh in xanix-runtime
      // {
      //   name: "xanix-react-refresh",
      //   resolveId(id) {
      //     if (id === "xanix/runtime") {
      //       return require.resolve("xanix/runtime");
      //     }
      //     return null;
      //   },
      //   load(id) {
      //     if (id === require.resolve("xanix/runtime")) {
      //       console.log(id);

      //       const code = fs.readFileSync(id, "utf-8");
      //       const modifiedCode = `${code}
      //         import RefreshRuntime from 'react-refresh/runtime';
      //         RefreshRuntime.injectIntoGlobalHook(window);
      //         window.$RefreshReg$ = () => {};
      //         window.$RefreshSig$ = () => (type) => type;
      //       `;
      //       return modifiedCode;
      //     }
      //     return null;
      //   },
      // },

      XanixAssets({
        external: true,
      }),
      XanixResolveCacheDeps(buildCache, entries),
      replace({
        preventAssignment: true,
        "process.env.NODE_ENV": JSON.stringify("development"),
      }),
      rollupNodeResolve(),
      rollupCommonjs(),
      // xanixHydrate(entries),

      rollupEsbuild({
        sourceMap: true,
      }),
      // xanixReactRefresh(),
    ],
    output: bundlerOutput.client(entries),
    watch: {
      clearScreen: false,
    },
  });

  watcher.on("event", (event) => {
    switch (event.code) {
      case "BUNDLE_START":
        break;
      case "BUNDLE_END":
        break;

      case "ERROR":
        console.error("[client]", event.error);
        break;
    }
  });

  return watcher;
};

export default WatchClient;
