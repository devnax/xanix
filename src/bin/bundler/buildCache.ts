import path from "node:path";
import { rollup } from "rollup";
import { build, type Plugin } from "esbuild";
import { XanixClientEntry } from "../types";
import { createRequire } from "node:module";
import xanixAssets from "./plugins/XanixAssets/index.js";
import rollupEsbuild from "./plugins/rollupEsbuild.js";

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
  const input: any = {};

  for (const entry of entries) {
    input[entry.name] = entry.file;
  }

  input["xanix-runtime"] = require.resolve("xanix/runtime");

  const bundle = await rollup({
    input,
    plugins: [
      xanixAssets({
        external: true,
      }),
      rollupEsbuild({
        sourceMap: true,
      }),
    ],
    external(id) {
      if (id.startsWith(".") || path.isAbsolute(id)) {
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
): { wrappers: Map<string, string>; wrappedInput: Record<string, string> } => {
  const wrappers = new Map<string, string>();
  const wrappedInput: Record<string, string> = {};

  for (const [name, resolved] of Object.entries(input)) {
    const key = `${name}?cjs-wrapper`;
    let namedExports: string[] = [];
    try {
      const mod = require(resolved);
      namedExports = Object.keys(mod).filter(
        (k) => k !== "__esModule" && k !== "default",
      );
    } catch {}

    const lines = [
      `import __mod from ${JSON.stringify(resolved)};`,
      `export default __mod;`,
    ];
    if (namedExports.length > 0) {
      lines.push(`export const { ${namedExports.join(", ")} } = __mod;`);
    }

    wrappers.set(key, lines.join("\n"));
    wrappedInput[name] = key;
  }

  return { wrappers, wrappedInput };
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
