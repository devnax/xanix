import path from "node:path";
import { OutputOptions } from "rollup";
import { XanixClientEntry } from "../../types";

const root = process.cwd();

export const outDir = {
  server: path.resolve(root, ".xanix"),
  client: path.resolve(root, ".xanix/client"),
};

type Options = {
  isDev?: boolean;
};

const client = (
  entries: XanixClientEntry[],
  { isDev }: Options,
): OutputOptions => {
  const _entries: any = {};
  for (const entry of entries) {
    _entries[entry.name] = entry;
  }

  const opt: OutputOptions = {
    dir: outDir.client,
    format: "esm",
    entryFileNames: (id: any) => {
      const entry = _entries[id.name];
      if (entry) {
        return `${entry.id}.js`;
      }
      return `[name].js`;
    },
  };
  if (isDev) {
    opt.sourcemap = true;
    opt.preserveModules = true;
    opt.preserveModulesRoot = process.cwd();
  } else {
    opt.chunkFileNames = "chunks/[hash].js";
    opt.assetFileNames = "assets/[name]-[hash][extname]";
  }
  return opt;
};

const server = (opt: Options): OutputOptions => {
  return {
    dir: outDir.server,
    format: "esm",
    sourcemap: opt.isDev ?? true,
    entryFileNames: "[name].js",
    chunkFileNames: "chunks/[name].js",
    assetFileNames: "assets/[hash][extname]",
    // manualChunks(id) {
    //   const filename = path.basename(id);
    //   return filename.split(".")[0];

    //   return "vendor";

    //   if (id.includes("virtual:xanix-document")) {
    //     return "vendor";
    //   }
    // },
  };
};

const bundlerOutput = {
  client,
  server,
};

export default bundlerOutput;
