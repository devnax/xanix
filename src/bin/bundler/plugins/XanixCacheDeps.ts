import path from "node:path";
import { createRequire } from "node:module";
import { rollup, type Plugin } from "rollup";
import outdirs from "../../../outdirs.js";
import XanixEnvPlugin from "./XanixEnv.js";
import nodeResolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import XanixDocument from "./XanixDocument/index.js";
import esbuild from "rollup-plugin-esbuild";
import defines from "../config/defines.js";
import fs from "node:fs";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const cacheDir = outdirs.cache;

const filename = (source: string) =>
  source.replace(/^@/, "").replace(/\//g, "-");

const cached = new Map<string, Promise<void>>();

function resolveFrom(source: string, fromDir: string): string {
  return require.resolve(source, { paths: [fromDir] });
}
async function getRealExportedKeys(
  resolvedEntry: string,
): Promise<{ modules: string[]; hasDefault: boolean }> {
  try {
    const mod = await import(pathToFileURL(resolvedEntry).href);

    const hasDefault =
      mod &&
      (typeof mod === "object" || typeof mod === "function") &&
      "default" in mod;
    const names = Object.keys(mod).filter(
      (key) => key !== "__esModule" && key !== "default",
    );
    return { modules: names, hasDefault };
  } catch {
    return { modules: [], hasDefault: false }; // native ESM or require failure — no shim possible/needed
  }
}
/**
 * Marks a dependency's transitive deps external using their BARE specifier
 * (e.g. "react", not "./react.js"). This lets @rollup/plugin-commonjs
 * resolve them normally via node resolution for its interop/named-exports
 * shim — resolving a real bare specifier always succeeds, unlike resolving
 * a synthetic relative path that doesn't exist on disk. The actual path
 * rewrite to "./react.js" happens afterward via output.paths, not here.
 */
const resolver = (externalsUsed: Set<string>): Plugin => {
  return {
    name: "xanix-cache-deps-resolver",
    async resolveId(source, importer) {
      if (source.startsWith(".") || path.isAbsolute(source)) {
        return null;
      }

      const fromDir = importer ? path.dirname(importer) : process.cwd();

      let resolved: string;
      try {
        resolved = resolveFrom(source, fromDir);
      } catch {
        return null;
      }

      await bundleCache(source, resolved);
      externalsUsed.add(source);

      // Bare id, external — commonjs plugin can resolve this for real.
      return { id: source, external: true };
    },
  };
};

const bundleCache = (source: string, resolvedEntry?: string): Promise<void> => {
  if (cached.has(source)) return cached.get(source)!;

  const promise = (async () => {
    const file = filename(source);
    const input = resolvedEntry ?? resolveFrom(source, process.cwd());
    const externalsUsed = new Set<string>();

    const isClient = true;
    const mode = "development";

    const build = await rollup({
      input,
      plugins: [
        resolver(externalsUsed),
        XanixEnvPlugin({ mode, isClient }),
        nodeResolve({
          browser: isClient,
          preferBuiltins: !isClient,
          extensions: [".mjs", ".js", ".jsx", ".json", ".ts", ".tsx"],
        }),
        commonjs(),
        json(),
        XanixDocument(),
        esbuild({
          target: isClient ? "es2022" : "node20",
          jsx: "automatic",
          tsconfig: false,
          define: defines({ mode, isClient }),
        }),
      ],
    });

    const paths: Record<string, string> = {};
    for (const dep of externalsUsed) {
      paths[dep] = `./${filename(dep)}.js`;
    }

    await build.write({
      dir: cacheDir,
      format: "esm",
      entryFileNames: `${file}.internal.js`,
      exports: "named",
      paths,
    });

    const { modules, hasDefault } = await getRealExportedKeys(
      resolvedEntry ?? input,
    );

    const lines = [`import __mod from './${file}.internal.js';`];

    if (hasDefault) {
      lines.push(`export default __mod.default;`);
    } else {
      lines.push(`export default __mod;`);
    }

    for (const exportName of modules) {
      if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(exportName)) {
        lines.push(
          `export const ${exportName} = __mod[${JSON.stringify(exportName)}] || __mod.default[${JSON.stringify(exportName)}]`,
        );
      }
    }

    await fs.promises.writeFile(
      path.join(cacheDir, `${file}.js`),
      lines.join("\n") + "\n",
      "utf8",
    );
  })();

  cached.set(source, promise);
  return promise;
};

export default function XanixCachedDeps(): Plugin {
  return {
    name: "xanix-cache-deps",

    async resolveId(source, importer) {
      if (source.startsWith(".") || path.isAbsolute(source)) {
        return null;
      }

      const fromDir = importer ? path.dirname(importer) : process.cwd();

      let resolved: string;
      try {
        resolved = resolveFrom(source, fromDir);
      } catch {
        return null;
      }

      await bundleCache(source, resolved);

      // Same principle applies here if this outer build also runs through
      // a commonjs plugin: prefer returning a bare-style external id and
      // supplying `paths` on the OUTER build's output config (in
      // WatchClient / bundlerOutput.client) rather than baking "../cache/x.js"
      // directly into the id.
      return {
        id: `/${outdirs.cache}/${filename(source)}.js`,
        external: true,
      };
    },
  };
}
