import { watch } from "rollup";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import esbuild from "rollup-plugin-esbuild";
import path from "node:path";

import type { ClientEntry } from "./clientDetector.js";
import { detectReactRoutes } from "./clientDetector.js";

const root = process.cwd();

export type WatcherOptions = {
  onBuildEnd?: (entries: Map<string, ClientEntry>) => void;
};

const WatchServer = async ({ onBuildEnd }: WatcherOptions = {}) => {
  const outputDir = path.resolve(root, ".xanix");
  const entries = new Map<string, ClientEntry>();
  const detector = detectReactRoutes({
    entries,
    onChange(id, change) {
      console.log(`[${change.event}] ${id}`);
    },
  });

  const watcher = watch({
    input: path.resolve(root, "index.tsx"),
    plugins: [
      detector,
      nodeResolve({
        preferBuiltins: true,
      }),
      commonjs(),
      esbuild({
        target: "es2022",
        platform: "node",
        jsx: "automatic",
      }),
    ],

    output: {
      file: path.resolve(outputDir, "server.js"),
      format: "esm",
      sourcemap: true,
      inlineDynamicImports: true,
    },

    external(id) {
      if (id.startsWith(".") || path.isAbsolute(id)) {
        return false;
      }
      return true;
    },

    watch: {
      clearScreen: false,
    },
  });

  watcher.on("event", async (event) => {
    switch (event.code) {
      case "BUNDLE_START":
        console.log("[server] building...");
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
