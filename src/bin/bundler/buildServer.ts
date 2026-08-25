import { rollup } from "rollup";
import path from "node:path";
import fs from "node:fs";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import esbuild from "rollup-plugin-esbuild";
import { XanixTransform } from "./plugins/XanixTransform/index.js";
import { createManifest } from "../include/manifest.js";
import { XanixClientEntry } from "../types.js";
import generateClientEntries from "./generateClientEntries.js";

const root = process.cwd();

export type WatcherOptions = {
  rootEntry: string;
  onBuildEnd: (entries: XanixClientEntry[]) => Promise<void>;
};

const BuildServer = async ({ rootEntry, onBuildEnd }: WatcherOptions) => {
  const outputDir = path.resolve(root, ".xanix");

  fs.rmSync(outputDir, {
    recursive: true,
    force: true,
  });

  fs.mkdirSync(outputDir, {
    recursive: true,
  });

  const entries = await generateClientEntries();
  await createManifest(entries);

  const build = await rollup({
    input: path.resolve(root, rootEntry),
    onwarn(warning, warn) {
      if (
        warning.code === "MODULE_LEVEL_DIRECTIVE" &&
        warning.message.includes('"use client"')
      ) {
        return;
      }

      warn(warning);
    },
    plugins: [
      XanixTransform({}),

      nodeResolve({
        preferBuiltins: true,
        extensions: [".mjs", ".js", ".json", ".node", ".ts", ".tsx", ".jsx"],
      }),

      commonjs({
        include: /node_modules/,
        extensions: [".js", ".cjs"],
        transformMixedEsModules: true,
      }),

      esbuild({
        target: "es2022",
        platform: "node",
        format: "esm",
        jsx: "automatic",
        minify: true,
        sourceMap: false,
      }),
    ],

    external(id) {
      if (
        id.startsWith("node:") ||
        [
          "assert",
          "buffer",
          "child_process",
          "cluster",
          "console",
          "constants",
          "crypto",
          "dgram",
          "diagnostics_channel",
          "dns",
          "dns/promises",
          "domain",
          "events",
          "fs",
          "fs/promises",
          "http",
          "http2",
          "https",
          "module",
          "net",
          "os",
          "path",
          "perf_hooks",
          "process",
          "punycode",
          "querystring",
          "readline",
          "readline/promises",
          "repl",
          "stream",
          "stream/promises",
          "stream/web",
          "string_decoder",
          "sys",
          "timers",
          "timers/promises",
          "tls",
          "trace_events",
          "tty",
          "url",
          "util",
          "util/types",
          "v8",
          "vm",
          "wasi",
          "worker_threads",
          "zlib",
        ].includes(id)
      ) {
        return true;
      }

      if (id.startsWith(".") || path.isAbsolute(id)) {
        return false;
      }

      // Keep packages external
      return true;
    },
  });

  await build.write({
    dir: outputDir,
    format: "esm",
    sourcemap: false,
    entryFileNames: "index.js",
    // chunkFileNames: "chunks/[hash].js",
    assetFileNames: "assets/[hash][extname]",
  });

  await build.close();
  await onBuildEnd(entries);
};

export default BuildServer;
