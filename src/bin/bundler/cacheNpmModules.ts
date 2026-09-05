import path from "node:path";
import { rollup } from "rollup";
import { build, type Plugin } from "esbuild";
import { XanixClientEntry } from "../types";
import { createRequire } from "node:module";
import { getClientRuntimeFile } from "../include/utils.js";
import outdirs from "../../outdirs.js";
import { xanixCachePlugins, xanixDefaultPlugins } from "./plugins/plugins.js";
import defines from "./config/defines.js";
import { pathToFileURL } from "node:url";
import external from "./config/external.js";

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
    plugins: [...xanixCachePlugins()],
    external(id) {
      if (!external(id)) {
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

const buildWrappers = async (
  input: Record<string, string>,
): Promise<{
  wrappers: Map<string, string>;
  wrappedInput: Record<string, string>;
}> => {
  const wrappers = new Map<string, string>();
  const wrappedInput: Record<string, string> = {};

  for (const [name, resolved] of Object.entries(input)) {
    const key = `${name}?cjs-wrapper`;

    let namedExports: string[] = [];
    let hasDefault = false;

    try {
      // Node: inspect the actual module
      const mod = await import(pathToFileURL(resolved).href);

      hasDefault =
        mod &&
        (typeof mod === "object" || typeof mod === "function") &&
        "default" in mod;

      namedExports = Object.keys(mod).filter(
        (key) => key !== "__esModule" && key !== "default",
      );
    } catch (err) {
      console.log(`Failed to inspect ${name}:`, err);
    }

    // esbuild: use a normal filesystem path
    const lines = [`import * as __mod from ${JSON.stringify(resolved)};`];

    if (hasDefault) {
      lines.push(`export default __mod.default;`);
    } else {
      lines.push(`export default __mod;`);
    }

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
  const { wrappers, wrappedInput } = await buildWrappers(input);

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
    define: defines({ mode: "development", isClient: true }),
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

  const cacheDir = path.resolve(outdirs.server, "cache");
  await bundleDeps(input, cacheDir);

  return metadata;
};

export default BuildCache;
