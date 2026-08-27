import { rollup } from "rollup";
import path from "node:path";
import bundlerOutput, { outDir } from "./config/output.js";
import fs from "node:fs";
import { XanixTransform } from "./plugins/XanixTransform/index.js";
import { createManifest } from "../include/manifest.js";
import { XanixClientEntry } from "../types.js";
import generateClientEntries from "./generateClientEntries.js";
import xanixAssets from "./plugins/XanixAssets/index.js";
import rollupEsbuild from "./plugins/rollupEsbuild.js";
import rollupNodeResolve from "./plugins/nodeResolve.js";
import rollupCommonjs from "./plugins/commonjs.js";
import { getDocumentFile } from "../include/utils.js";

const root = process.cwd();

export type WatcherOptions = {
  rootEntry: string;
  onBuildEnd: (entries: XanixClientEntry[]) => Promise<void>;
};

const BuildServer = async ({ rootEntry, onBuildEnd }: WatcherOptions) => {
  fs.rmSync(outDir.server, {
    recursive: true,
    force: true,
  });

  fs.mkdirSync(outDir.server, {
    recursive: true,
  });

  const entries = await generateClientEntries();
  await createManifest(entries);
  const input = {
    index: path.resolve(root, rootEntry),
    "xanix-document": await getDocumentFile(),
  };

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
      xanixAssets(),
      XanixTransform({ mode: "start" }),
      rollupNodeResolve(false),
      rollupCommonjs(),
      rollupEsbuild({
        minify: true,
      }),
    ],

    external(id) {
      if (id.startsWith(".") || path.isAbsolute(id)) {
        return false;
      }
      return true;
    },
  });

  await build.write(bundlerOutput.server());

  await build.close();
  await onBuildEnd(entries);
};

export default BuildServer;
