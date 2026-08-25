import path from "node:path";
import { OutputOptions } from "rollup";
import { XanixClientEntry } from "../../types";

const root = process.cwd();

export const outDir = {
  server: path.resolve(root, ".xanix"),
  client: path.resolve(root, ".xanix/client"),
};

const client = (entries: XanixClientEntry[]): OutputOptions => {
  const _entries: any = {};
  for (const entry of entries) {
    _entries[entry.name] = entry;
  }
  return {
    dir: outDir.client,
    format: "esm",
    sourcemap: true,
    entryFileNames: (id: any) => {
      if (id.name === "xanix-runtime") {
        return "runtime.js";
      }
      const entry = _entries[id.name];
      return `pages/${entry.id}.js`;
    },
    chunkFileNames: "chunks/[name]-[hash].js",
    assetFileNames: "assets/[name]-[hash][extname]",
  };
};

const server = (): OutputOptions => {
  return {
    dir: outDir.server,
    format: "esm",
    sourcemap: false,
    entryFileNames: "index.js",
    chunkFileNames: "chunks/[hash].js",
    assetFileNames: "assets/[hash][extname]",
  };
};

const bundlerOutput = {
  client,
  server,
};

export default bundlerOutput;
