import { watch, type InputOption, type RollupWatcher } from "rollup";
import path from "node:path";
import fs from "node:fs";
import type { ClientEntry } from "./clientDetector.js";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import esbuild from "rollup-plugin-esbuild";

const WatchClient = (entries: Map<string, ClientEntry>): RollupWatcher => {
  const root = process.cwd();

  const clientDir = path.resolve(root, ".xanix/client");

  fs.mkdirSync(clientDir, {
    recursive: true,
  });

  const input: InputOption = {};

  for (const entry of entries.values()) {
    input[entry.component.toLowerCase()] = entry.importer;
  }

  const watcher = watch({
    input,
    plugins: [
      nodeResolve({
        browser: true,
      }),

      commonjs(),

      esbuild({
        target: "es2022",
        platform: "browser",
        jsx: "automatic",
        sourceMap: true,
      }),
    ],

    output: {
      dir: clientDir,
      entryFileNames: "[name].js",
      format: "esm",
      sourcemap: true,
    },
    watch: {
      clearScreen: false,
    },
  });

  watcher.on("event", (event) => {
    switch (event.code) {
      case "START":
        console.log("[client] building...");
        break;

      case "BUNDLE_START":
        console.log("[client] bundling...");
        break;

      case "BUNDLE_END":
        console.log(`[client] built in ${event.duration}ms`);
        break;

      case "END":
        console.log("[client] watching...");
        break;

      case "ERROR":
        console.error("[client]", event.error);
        break;
    }
  });

  return watcher;
};

export default WatchClient;
