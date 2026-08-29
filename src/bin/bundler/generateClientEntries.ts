import { rollup } from "rollup";
import path from "node:path";
import { type XanixClientEntry } from "../types.js";
import { XanixEntryFinder } from "./plugins/XanixEntryFinder/index.js";
import url from "@rollup/plugin-url";
import esbuild from "rollup-plugin-esbuild";
import XanixTsconfigAlias from "./plugins/XanixTsconfigAlias.js";
import { nodeResolve } from "@rollup/plugin-node-resolve";
const root = process.cwd();

const generateClientEntries = async (): Promise<XanixClientEntry[]> => {
  const entries = new Map<string, XanixClientEntry>();
  const bundle = await rollup({
    input: path.resolve(root, "index.tsx"),
    plugins: [
      XanixTsconfigAlias(),
      nodeResolve({
        extensions: [".mjs", ".js", ".jsx", ".json", ".ts", ".tsx"],
      }),
      XanixEntryFinder({
        entries,
      }),
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
          "**/*.css",
        ],
        limit: 0,
        fileName: "assets/[name]-[hash][extname]",
        emitFiles: true,
      }),
      esbuild({
        target: "es2022",
        jsx: "automatic",
        tsconfig: false,
      }),
    ],

    external(id) {
      if (
        id.startsWith(".") ||
        path.isAbsolute(id) ||
        id === "@" ||
        id.startsWith("@/")
      ) {
        return false;
      }
      return true;
    },
  });
  await bundle.close();
  return Array.from(entries.values());
};

export default generateClientEntries;
