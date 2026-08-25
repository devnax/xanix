import { watch, type InputOption, type RollupWatcher } from "rollup";
import path from "node:path";
import fs from "node:fs";
import replace from "@rollup/plugin-replace";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import esbuild from "rollup-plugin-esbuild";
import { createRequire } from "node:module";
import { XanixClientEntry } from "../types";
import BuildCache, { CacheMetadata } from "./buildCache.js";
import type { Plugin } from "rollup";
import url from "@rollup/plugin-url";

const root = process.cwd();
const outputDir = path.resolve(root, ".xanix/client");
const require = createRequire(import.meta.url);

function xanixCachedDeps(
  metadata: CacheMetadata,
  entries: XanixClientEntry[],
): Plugin {
  return {
    name: "xanix:cached-deps",

    async resolveId(source) {
      if (source.startsWith(".") || path.isAbsolute(source)) {
        return null;
      }

      const dependency = metadata.get(source);
      if (dependency) {
        return { id: `/.xanix/cache/${dependency.file}`, external: true };
      }

      const buildCache = await BuildCache(entries);
      const newDependency = buildCache.get(source);
      if (newDependency) {
        return { id: `/.xanix/cache/${newDependency.file}`, external: true };
      }
    },
  };
}

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
  const buildCache = await BuildCache(entries);

  const watcher = watch({
    input,
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
      xanixCachedDeps(buildCache, entries),
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
        include: /\.(mjs|js|cjs|ts|tsx|jsx)$/,
      }),
    ],
    output: {
      dir: outputDir,
      format: "esm",
      sourcemap: true,
      entryFileNames: (id: any) => {
        if (id.name === "xanix-runtime") {
          return "runtime.js";
        }
        return `pages/${id.name.toLowerCase()}.js`;
      },
      chunkFileNames: "chunks/[name]-[hash].js",
      assetFileNames: "assets/[name]-[hash][extname]",
    },
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
