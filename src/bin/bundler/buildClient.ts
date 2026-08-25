import { rollup, type InputOption } from "rollup";
import fs from "node:fs";
import replace from "@rollup/plugin-replace";
import { createRequire } from "node:module";
import { XanixClientEntry } from "../types";
import XanixAssets from "./plugins/XanixAssets/index.js";
import rollupEsbuild from "./plugins/rollupEsbuild.js";
import rollupNodeResolve from "./plugins/nodeResolve.js";
import rollupCommonjs from "./plugins/commonjs.js";
import bundlerOutput, { outDir } from "./config/output.js";

const root = process.cwd();
const require = createRequire(import.meta.url);

const buildClient = async (entries: XanixClientEntry[]) => {
  const input: InputOption = {};
  for (const entry of entries) {
    input[entry.name] = entry.file;
  }

  input["xanix-runtime"] = require.resolve("xanix/runtime-client");

  fs.rmSync(outDir.client, {
    recursive: true,
    force: true,
  });

  fs.mkdirSync(outDir.client, {
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
      XanixAssets({
        external: true,
      }),
      replace({
        preventAssignment: true,
        "process.env.NODE_ENV": JSON.stringify("development"),
      }),
      rollupNodeResolve(),
      rollupCommonjs(),
      rollupEsbuild({
        minify: true,
      }),
    ],
  });

  await build.write(bundlerOutput.client);

  await build.close();
};

export default buildClient;
