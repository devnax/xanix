import { rollup } from "rollup";
import path from "node:path";
import esbuild from "rollup-plugin-esbuild";
import { XanixClientEntry } from "../types.js";
import { XanixEntryFinder } from "./plugins/XanixEntryFinder/index.js";
import url from "@rollup/plugin-url";
const root = process.cwd();

const generateClientEntries = async (): Promise<XanixClientEntry[]> => {
  const entries = new Map<string, XanixClientEntry>();
  const bundle = await rollup({
    input: path.resolve(root, "index.tsx"),
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
        limit: 0,
        fileName: "assets/[name]-[hash][extname]",
      }),
      XanixEntryFinder({
        entries,
      }),
      esbuild({
        target: "es2022",
        platform: "node",
        jsx: "automatic",
        sourceMap: true,
      }),
    ],

    external(id) {
      if (id.startsWith(".") || path.isAbsolute(id)) {
        return false;
      }
      return true;
    },
  });
  await bundle.close();
  return Array.from(entries.values());
};

export default generateClientEntries;
