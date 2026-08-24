import { rollup, watch, type InputOption, type RollupWatcher } from "rollup";
import path from "node:path";
import fs from "node:fs";
import replace from "@rollup/plugin-replace";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import esbuild from "rollup-plugin-esbuild";
import { createRequire } from "node:module";
import { XanixClientEntry } from "../../types";
import vendorExternalPlugin from "./external.js";

const root = process.cwd();
const outputDir = path.resolve(root, ".xanix/client");
const require = createRequire(import.meta.url);

const plugins = [
  vendorExternalPlugin(),
  replace({
    preventAssignment: true,
    "process.env.NODE_ENV": JSON.stringify("development"),
  }),
  nodeResolve({
    browser: true,
    extensions: [".mjs", ".js", ".json", ".node", ".ts", ".tsx", ".jsx"],
    preferBuiltins: false,
  }),

  commonjs({
    include: /node_modules/,
    extensions: [".js", ".cjs"],
    transformMixedEsModules: true,
  }),

  esbuild({
    target: "es2022",
    platform: "browser",
    format: "esm",
    jsx: "automatic",
    sourceMap: true,
  }),
];

const output = {
  dir: outputDir,
  format: "esm",
  sourcemap: true,
  entryFileNames: (id: any) => {
    if (id.name === "xanix-runtime") {
      return "runtime.js";
    }
    return "pages/[name].js";
  },
  chunkFileNames: "chunks/[name]-[hash].js",
  assetFileNames: "assets/[name]-[hash][extname]",
};

const WatchClient = async (
  entries: XanixClientEntry[],
): Promise<RollupWatcher> => {
  const input: InputOption = {};

  for (const entry of entries) {
    input[entry.name] = entry.file;
  }

  input["xanix-runtime"] = require.resolve("xanix/runtime-client");

  fs.rmSync(outputDir, {
    recursive: true,
    force: true,
  });

  fs.mkdirSync(outputDir, {
    recursive: true,
  });

  const watcher = watch({
    input,
    plugins,
    output: output as any,
    watch: {
      clearScreen: false,
    },
  });

  watcher.on("event", (event) => {
    switch (event.code) {
      case "BUNDLE_START":
        break;

      case "BUNDLE_END":
        console.log(`[client] built in ${event.duration}ms`);
        break;

      case "ERROR":
        console.error("[client]", event.error);
        break;
    }
  });

  return watcher;
};

export default WatchClient;
