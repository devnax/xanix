import path from "node:path";
import { OutputOptions } from "rollup";

const root = process.cwd();

export const outDir = {
  server: path.resolve(root, ".xanix"),
  client: path.resolve(root, ".xanix/client"),
};

const client: OutputOptions = {
  dir: outDir.client,
  format: "esm",
  sourcemap: true,
  entryFileNames: (id: any) => {
    if (id.name === "xanix-runtime") {
      return "runtime.js";
    }
    return `pages/${id.name.toLowerCase()}.js`;
  },
  chunkFileNames: "chunks/[name]-[hash].js",
  assetFileNames: "assets/[name]-[hash][extname]",
};

const server: OutputOptions = {
  dir: outDir.server,
  format: "esm",
  sourcemap: false,
  entryFileNames: "index.js",
  chunkFileNames: "chunks/[hash].js",
  assetFileNames: "assets/[hash][extname]",
};

const bundlerOutput = {
  client,
  server,
};

export default bundlerOutput;
