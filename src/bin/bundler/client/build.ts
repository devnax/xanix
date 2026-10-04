import { rolldown, type InputOption } from "rolldown";
import fs from "node:fs";
import { XanixClientEntry } from "../../types.js";
import {
  getClientRuntimeFile,
  getClientRuntimeFileName,
} from "../../include/utils.js";
import outdirs from "../../../outdirs.js";
import XanixTransformer from "./plugins/Transformer.js";
import xanixAssets from "../../plugins/XanixAssets.js";
import xanixDocument from "../../plugins/XanixDocument.js";
import xanixTsconfigAlias from "../../plugins/XanixTsconfigAlias.js";
import loadEnv from "../../include/loadEnv.js";
import { getManifest } from "../../include/manifest.js";

const buildClient = async () => {
  const entries = await getManifest();
  const input: InputOption = {};
  for (const entry of entries) {
    input[entry.name] = entry.resolved;
  }

  const runtimeFileName = getClientRuntimeFileName("production");
  input[runtimeFileName] = getClientRuntimeFile();

  const build = await rolldown({
    input,
    treeshake: true,
    tsconfig: true,
    checks: {
      moduleLevelDirective: false,
    },
    resolve: {
      extensions: [".mjs", ".js", ".jsx", ".json", ".ts", ".tsx"],
      conditionNames: ["browser", "import", "module", "default"],
    },
    transform: {
      target: "es2022",
      jsx: {
        runtime: "automatic",
      },
      define: await loadEnv({
        mode: "production",
        isClient: true,
      }),
    },
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
      xanixAssets({
        emit: false,
      }),
      xanixTsconfigAlias(),
      xanixDocument(),
      XanixTransformer(),
    ],
  });

  await build.write({
    dir: outdirs.client,
    minify: true,
    format: "esm",
    chunkFileNames: "chunks/[hash].js",
    assetFileNames: "assets/[name][extname]",
    entryFileNames: (id: any) => {
      const entry = entries.find((e) => e.name === id.name);
      if (entry) {
        return `${entry.id}.js`;
      }
      return `[name].js`;
    },
  });
  await build.close();
};

export default buildClient;
