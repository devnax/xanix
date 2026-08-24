import { rollup } from "rollup";
import path from "node:path";
import esbuild from "rollup-plugin-esbuild";
import { XanixClientEntry } from "../types.js";
import { XanixEntryFinder } from "../plugins/XanixEntryFinder/index.js";
import { readManifest } from "./manifest.js";

const root = process.cwd();

export const generateClientEntries = async (): Promise<XanixClientEntry[]> => {
  const entries = new Map<string, XanixClientEntry>();
  await rollup({
    input: path.resolve(root, "index.tsx"),
    plugins: [
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
  return Array.from(entries.values());
};

export const getEntries = async (): Promise<XanixClientEntry[]> => {
  const manifest = await readManifest();
  if (!manifest) {
    return [];
  }
  return manifest.entries;
};

export const entriesEqual = async (entries: XanixClientEntry[]) => {
  const manifest = await readManifest();
  if (!manifest) {
    return false;
  }
  if (manifest.entries.length !== entries.length) {
    return false;
  }
  for (const entry of manifest.entries) {
    const existingEntry = entries.find((e) => e.id === entry.id);
    if (!existingEntry) {
      return false;
    }
    if (
      existingEntry.name !== entry.name ||
      existingEntry.file !== entry.file
    ) {
      return false;
    }
  }

  return true;
};
