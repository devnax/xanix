import { OutputOptions } from "rolldown";
import { XanixClientEntry } from "../../types";
import outdirs from "../../../outdirs.js";

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
    dir: outdirs.client,
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
    opt.assetFileNames = "assets/[name][extname]";
  }
  return opt;
};

const server = (opt: Options): OutputOptions => {
  const options: OutputOptions = {
    dir: outdirs.server,
    format: "esm",

    entryFileNames: "[name].js",
    chunkFileNames: "chunks/[name].js",
    assetFileNames: "assets/[name][extname]",
  };

  if (opt.isDev) {
    options.sourcemap = true;
    options.preserveModules = true;
    options.preserveModulesRoot = process.cwd();
  } else {
    options.chunkFileNames = "chunks/[hash].js";
    options.assetFileNames = "assets/[name][extname]";
  }

  return options;
};

const bundlerOutput = {
  client,
  server,
};

export default bundlerOutput;
