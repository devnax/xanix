import { rollup, type InputOption } from "rollup";
import fs from "node:fs";
import { createRequire } from "node:module";
import { XanixClientEntry } from "../types";
import bundlerOutput, { outDir } from "./config/output.js";
import { getDocumentFile } from "../include/utils.js";
import { xanixDefaultPlugins } from "./plugins/plugins.js";

const require = createRequire(import.meta.url);

const buildClient = async (entries: XanixClientEntry[]) => {
  const input: InputOption = {};
  for (const entry of entries) {
    input[entry.name] = entry.file;
  }

  input["xanix-runtime"] = require.resolve("xanix/runtime");
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
