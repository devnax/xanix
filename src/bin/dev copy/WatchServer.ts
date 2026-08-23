import { watch } from "rollup";

import path from "node:path";

import type { ClientEntry } from "./clientDetector.js";
import { detectReactRoutes } from "./clientDetector.js";

import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import esbuild from "rollup-plugin-esbuild";

const root = process.cwd();

export type WatcherOptions = {
  onBuildEnd?: (entries: Map<string, ClientEntry>) => void;
};

const WatchServer = ({ onBuildEnd }: WatcherOptions = {}) => {
  const outputDir = path.resolve(root, ".xanix/server");
  const entries = new Map<string, ClientEntry>();

  const watcher = watch({
    input: path.resolve(root, "index.tsx"),
    plugins: [
      detectReactRoutes({
        entries,
        onChange(id, change) {
          console.log(`[server] [${change.event}] ${id}`);
        },
      }),

      nodeResolve({
        preferBuiltins: true,
      }),
      commonjs(),
      esbuild({
        target: "es2022",
        platform: "node",
        jsx: "automatic",
        sourceMap: true,
      }),
    ],

    external(id) {
      if (id.startsWith(".") || path.isAbsolute(id)) {
        return false;
      }
      return true;
    },

    output: {
      dir: outputDir,
      format: "esm",
      sourcemap: true,
      preserveModules: true,
      preserveModulesRoot: root,
    },
    watch: {
      clearScreen: false,
    },
  });

  watcher.on("event", (event) => {
    switch (event.code) {
      case "BUNDLE_START":
        // console.log("[server] bundling...");
        break;

      case "BUNDLE_END":
        console.log(`[server] built in ${event.duration}ms`);
        onBuildEnd?.(new Map(entries));
        break;
      case "ERROR":
        console.error("[server]", event.error);
        break;
    }
  });

  return watcher;
};

export default WatchServer;
