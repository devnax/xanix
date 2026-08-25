import { rollup, type InputOption } from "rollup";
import path from "node:path";
import fs from "node:fs";
import replace from "@rollup/plugin-replace";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import esbuild from "rollup-plugin-esbuild";
import { createRequire } from "node:module";
import { XanixClientEntry } from "../types";

const root = process.cwd();
const outputDir = path.resolve(root, ".xanix/client");
const require = createRequire(import.meta.url);

const buildClient = async (entries: XanixClientEntry[]) => {
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

  const build = await rollup({
    input,
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
        sourceMap: false,
        minify: true,
      }),
    ],
  });

  await build.write({
    dir: outputDir,
    format: "esm",
    sourcemap: false,
    entryFileNames: (id: any) => {
      if (id.name === "xanix-runtime") {
        return "runtime.js";
      }
      return `pages/${id.name.toLowerCase()}.js`;
    },
    chunkFileNames: "chunks/[name]-[hash].js",
    assetFileNames: "assets/[name]-[hash][extname]",
  });

  await build.close();
};

export default buildClient;
