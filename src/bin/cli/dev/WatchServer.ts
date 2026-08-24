import { watch } from "rollup";
import path from "node:path";
import fs from "node:fs";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import esbuild from "rollup-plugin-esbuild";
import { XanixTransform } from "../../plugins/XanixTransform/index.js";
import { createManifest, readManifest } from "../../include/manifest.js";
import { XanixClientEntry } from "../../types.js";
import {
  entriesEqual,
  generateClientEntries,
} from "../../include/clientEntry.js";

const root = process.cwd();

export type WatcherOptions = {
  onBuildEnd?: () => Promise<void>;
  onClientChange: () => Promise<void>;
  onClientEntryChange: (entries: XanixClientEntry[]) => Promise<void>;
  onServerChange: () => Promise<void>;
};

const WatchServer = async ({
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
    input: path.resolve(root, "index.tsx"),

    plugins: [
      XanixTransform({
        onChange: async (entry) => {
          const manifest = await readManifest();

          if (!manifest) {
            return;
          }

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

            await onServerChange();
          } else {
            await onClientChange();
          }
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
      entryFileNames: "[name].js",
      chunkFileNames: "chunks/[name]-[hash].js",
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
        console.log(`[server] built in ${event.duration}ms`);
        await onBuildEnd?.();
        break;

      case "ERROR":
        console.error("[server]", event.error);
        break;
    }
  });

  return watcher;
};

export default WatchServer;
