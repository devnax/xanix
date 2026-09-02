import { rollup, type InputOption } from "rollup";
import fs from "node:fs";
import { XanixClientEntry } from "../types";
import bundlerOutput from "./config/output.js";
import {
  getClientRuntimeFile,
  getClientRuntimeFileName,
} from "../include/utils.js";
import { xanixDefaultPlugins } from "./plugins/plugins.js";
import outdirs from "../../outdirs.js";

const buildClient = async (entries: XanixClientEntry[]) => {
  const input: InputOption = {};
  for (const entry of entries) {
    input[entry.name] = entry.file;
  }

  const runtimeFileName = getClientRuntimeFileName("production");
  input[runtimeFileName] = getClientRuntimeFile();

  fs.rmSync(outdirs.client, {
    recursive: true,
    force: true,
  });

  fs.mkdirSync(outdirs.client, {
    recursive: true,
  });

  const build = await rollup({
    input,
    treeshake: true,
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
      ...xanixDefaultPlugins({
        target: "client",
        development: false,
        assetExternal: true,
      }),
    ],
  });

  await build.write(bundlerOutput.client(entries, { isDev: false }));
  await build.close();
};

export default buildClient;
