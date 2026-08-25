import { watch } from "rollup";
import path from "node:path";
import fs from "node:fs";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import esbuild from "rollup-plugin-esbuild";
import { XanixTransform } from "./plugins/XanixTransform/index.js";
import { createManifest, readManifest } from "../include/manifest.js";
import { XanixClientEntry } from "../types.js";
import url from "@rollup/plugin-url";
import generateClientEntries from "./generateClientEntries.js";
import { entriesEqual } from "../include/entry.js";

const root = process.cwd();

export type WatcherOptions = {
  rootEntry: string;
  onChange?: (
    id: string,
    event: "update" | "delete" | "create" | undefined,
  ) => Promise<void>;
  onBuildEnd?: (entries: XanixClientEntry[]) => Promise<void>;
  onClientChange?: (entries: XanixClientEntry[]) => Promise<void>;
  onClientEntryChange: (entries: XanixClientEntry[]) => Promise<void>;
  onServerChange?: (entries: XanixClientEntry[]) => Promise<void>;
};

const watchServer = async ({
  rootEntry,
  onChange,
  onBuildEnd,
  onClientChange,
  onServerChange,
  onClientEntryChange,
}: WatcherOptions) => {
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

  const watcher = watch({
    input: path.resolve(root, rootEntry),

    plugins: [
      url({
        include: [
          "**/*.jpg",
          "**/*.jpeg",
          "**/*.png",
          "**/*.gif",
          "**/*.webp",
          "**/*.svg",
          "**/*.ico",
          "**/*.woff",
          "**/*.woff2",
          "**/*.ttf",
          "**/*.eot",
        ],

        // Always emit a physical file.
        limit: 0,

        fileName: "assets/[name]-[hash][extname]",
      }),
      XanixTransform({
        onChange: async (entry, change) => {
          const manifest = await readManifest();
          if (!manifest) return;

          const isClientEntry = Array.from(manifest.entries.values()).find(
            (e) => e.file === entry,
          );

          if (!isClientEntry) {
            const entries = await generateClientEntries();
            const isEqual = await entriesEqual(entries);
            if (!isEqual) {
              await createManifest(entries);
              await onClientEntryChange(entries);
            }

            await onServerChange?.(entries);
          } else {
            await onClientChange?.(entries);
          }

          onChange?.(entry, change?.event);
        },
      }),

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
        sourceMap: true,
        include: /\.(mjs|js|cjs|ts|tsx|jsx)$/,
      }),
    ],

    external(id) {
      // Node built-ins
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

      // Relative imports and absolute project files
      if (id.startsWith(".") || path.isAbsolute(id)) {
        return false;
      }

      // Keep packages external
      return true;
    },

    output: {
      dir: outputDir,
      format: "esm",
      sourcemap: true,
      entryFileNames: "index.js",
      chunkFileNames: "chunks/[name].js",
      assetFileNames: "assets/[name]-[hash][extname]",
    },

    watch: {
      clearScreen: false,
    },
  });

  watcher.on("event", async (event) => {
    switch (event.code) {
      case "BUNDLE_START":
        break;

      case "BUNDLE_END":
        // console.log(`[server] built in ${event.duration}ms`);
        await onBuildEnd?.(entries);
        break;

      case "ERROR":
        console.error("[server]", event.error);
        break;
    }
  });

  return watcher;
};

export default watchServer;
