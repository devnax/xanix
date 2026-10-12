import { rolldown, type InputOption } from "rolldown";
import { frameworkDir } from "../../include/utils.js";
import outdirs from "../../../outdirs.js";
import XanixTransformer from "./plugins/Transformer.js";
import XanixPages from "./plugins/XanixPages.js";
import xanixAssets from "../../plugins/XanixAssets.js";
import xanixDocument from "../../plugins/XanixDocument.js";
import xanixTsconfigAlias from "../../plugins/XanixTsconfigAlias.js";
import loadEnv from "../../include/loadEnv.js";
import { getManifest } from "../../include/manifest.js";
import path from "node:path";

const buildClient = async () => {
  const entries = await getManifest();

  const build = await rolldown({
    input: path.join(frameworkDir, "dist/client-runtime.js"),
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
      xanixAssets(),
      xanixTsconfigAlias(),
      XanixPages(),
      xanixDocument(),
      XanixTransformer(),
    ],
  });

  await build.write({
    dir: outdirs.client,
    minify: true,
    format: "esm",
    chunkFileNames: "chunks/[hash]c.js",
    assetFileNames: "assets/[name][extname]",
    entryFileNames: `runtime.js`,
  });
  await build.close();

  return entries;
};

export default buildClient;
