import path from "node:path";
import { rollup } from "rollup";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import { build, type Plugin } from "esbuild";
import { XanixClientEntry } from "../types";
import { createRequire } from "node:module";
import { getClientRuntimeFile } from "../include/utils.js";
import esbuild from "rollup-plugin-esbuild";
import url from "@rollup/plugin-url";
import XanixDocument from "./plugins/XanixDocument/index.js";

const require = createRequire(import.meta.url);

export type DependencyInfo = {
  source: string;
  resolved: string;
  packageName: string;
};

export type CacheMetadata = Map<
  string,
  {
    file: string;
  }
>;

const GenerateGraph = async (entries: XanixClientEntry[]) => {
  const collector = new Map<string, DependencyInfo>();
  const input: any = [];

  for (const entry of entries) {
    input.push(entry.file);
  }

  input.push(getClientRuntimeFile());

  const bundle = await rollup({
    input,
    plugins: [
      nodeResolve({
        extensions: [".mjs", ".js", ".jsx", ".json", ".ts", ".tsx"],
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
        emitFiles: false,
      }),
      XanixDocument(),
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
        id.startsWith("@/") ||
        id === "virtual:xanix-document"
      ) {
        return false;
      }
      collector.set(id, {
        source: id,
        resolved: require.resolve(id, {
          paths: [process.cwd()],
        }),
        packageName: id,
      });
      return true;
    },
  });

  await bundle.close();
  return collector;
};

// Wraps each CJS dep in a virtual ESM file that re-exports named exports detected via require()
const makeCjsWrapperPlugin = (wrappers: Map<string, string>): Plugin => ({
  name: "cjs-named-exports",
  setup(build) {
    build.onResolve({ filter: /\?cjs-wrapper$/ }, (args) => ({
      path: args.path,
      namespace: "cjs-wrapper",
    }));
    build.onLoad({ filter: /.*/, namespace: "cjs-wrapper" }, (args) => {
      const contents = wrappers.get(args.path)!;
      return { contents, resolveDir: process.cwd() };
    });
  },
});

const buildWrappers = (
  input: Record<string, string>,
): {
  wrappers: Map<string, string>;
  wrappedInput: Record<string, string>;
} => {
  const wrappers = new Map<string, string>();
  const wrappedInput: Record<string, string> = {};

  for (const [name, resolved] of Object.entries(input)) {
    const key = `${name}?cjs-wrapper`;

    let namedExports: string[] = [];
    let hasDefault = false;

    try {
      const mod = require(resolved);

      hasDefault =
        mod &&
        (typeof mod === "object" || typeof mod === "function") &&
        "default" in mod;

      namedExports = Object.keys(mod).filter(
        (key) => key !== "__esModule" && key !== "default",
      );
    } catch (err: any) {
      // console.log(err);
    }

    const lines = [`import * as __mod from ${JSON.stringify(resolved)};`];
    if (hasDefault) {
      lines.push(`export default __mod.default;`);
    } else {
      lines.push(`export default __mod;`);
    }
    lines.push("");
    for (const exportName of namedExports) {
      if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(exportName)) {
        lines.push(
          `export const ${exportName} = __mod[${JSON.stringify(exportName)}];`,
        );
      }
    }

    wrappers.set(key, lines.join("\n"));
    wrappedInput[name] = key;
  }

  return {
    wrappers,
    wrappedInput,
  };
};

const bundleDeps = async (input: Record<string, string>, outdir: string) => {
  const { wrappers, wrappedInput } = buildWrappers(input);

  await build({
    entryPoints: wrappedInput,
    bundle: true,
    splitting: true,
    format: "esm",
    target: "es2022",
    outdir,
    entryNames: "[name]",
    chunkNames: "chunks/[hash]",
    platform: "browser",
    sourcemap: true,
    define: {
      __XANIX_CLIENT__: "true",
      __XANIX_SERVER__: "false",
      __XANIX_DEV__: "true",
      __XANIX_PROD__: "false",
    },
    plugins: [makeCjsWrapperPlugin(wrappers)],
  });
};

const metadata: CacheMetadata = new Map();

const BuildCache = async (entries: XanixClientEntry[]) => {
  const input: Record<string, string> = {};
  const dependencies = await GenerateGraph(entries);
  for (const dependency of dependencies.values()) {
    const entryName = dependency.source.replace(/^@/, "").replace(/\//g, "-");
    input[entryName] = dependency.resolved;
    metadata.set(dependency.source, {
      file: `${entryName}.js`,
    });
  }

  const cacheDir = path.resolve(process.cwd(), ".xanix/cache");
  await bundleDeps(input, cacheDir);

  return metadata;
};

export default BuildCache;
