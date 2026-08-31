import { rollup, type InputOption } from "rollup";
import fs from "node:fs";
import { XanixClientEntry } from "../types";
import bundlerOutput, { outDir } from "./config/output.js";
import { getDocumentFile, getClientRuntimeFile } from "../include/utils.js";
import { xanixDefaultPlugins } from "./plugins/plugins.js";

const buildClient = async (entries: XanixClientEntry[]) => {
  const input: InputOption = {};
  for (const entry of entries) {
    input[entry.name] = entry.file;
  }

  input["xanix-runtime"] = getClientRuntimeFile();
  input["xanix-document"] = await getDocumentFile();

  fs.rmSync(outDir.client, {
    recursive: true,
    force: true,
  });

  fs.mkdirSync(outDir.client, {
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
