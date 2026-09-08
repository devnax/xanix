import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { rolldown, type Plugin } from "rolldown";
import { builtinModules, createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);

const nodeBuiltins = new Set(
  builtinModules.flatMap((id) => [id, `node:${id}`]),
);

export type CacheDepsPluginOptions = {
  /** Directory where built dependency bundles + manifest.json are written. */
  cacheDir: string;
  /** Return true for ids that should be pulled from the dep cache instead of bundled inline. */
  isExternal: (id: string) => boolean;
  /** URL prefix the dev server serves cacheDir under. Default "/__cache__/". */
  publicPath?: string;
  /** esbuild-style define map applied when building each cached dep. */
  define?: Record<string, string>;
  /** Log every resolveId decision to the console. Use temporarily to diagnose why nothing's caching. */
  debug?: boolean;
};

type ManifestEntry = {
  source: string;
  resolved: string;
  file: string;
  key: string; // cache-invalidation fingerprint (mtime+size based)
};

type Manifest = Record<string, ManifestEntry>;

const readManifest = (cacheDir: string): Manifest => {
  const file = path.join(cacheDir, "manifest.json");
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return {};
  }
};

const writeManifest = (cacheDir: string, manifest: Manifest) => {
  fs.mkdirSync(cacheDir, { recursive: true });
  fs.writeFileSync(
    path.join(cacheDir, "manifest.json"),
    JSON.stringify(manifest, null, 2),
  );
};

// Cheap, fast fingerprint: mtime + size of the resolved entry file.
const fingerprint = (resolved: string): string => {
  const stat = fs.statSync(resolved);
  return `${stat.size}-${stat.mtimeMs}`;
};

const entryNameFor = (source: string): string =>
  source.replace(/^@/, "").replace(/\//g, "-");

// Ids owned by other plugins: virtual modules (foo:bar convention), rollup's
// null-byte convention (\0foo), or anything else that isn't a real bare npm
// specifier. require.resolve() can never find these on disk — don't try.
const isVirtualId = (id: string): boolean =>
  id.startsWith("\0") || /^[a-zA-Z][\w+.-]*:/.test(id);

// Inspects the resolved CJS/ESM module and generates a small ESM shim that
// re-exports its default + named exports, so rolldown always sees a clean ESM entry.
const makeEsmShim = async (resolved: string): Promise<string> => {
  let namedExports: string[] = [];
  let hasDefault = false;

  try {
    const mod = await import(pathToFileURL(resolved).href);
    hasDefault =
      mod &&
      (typeof mod === "object" || typeof mod === "function") &&
      "default" in mod;
    namedExports = Object.keys(mod).filter(
      (key) => key !== "__esModule" && key !== "default",
    );
  } catch (err) {
    console.warn(`[cache-deps] failed to inspect ${resolved}:`, err);
  }

  const lines = [`import * as __mod from ${JSON.stringify(resolved)};`];
  lines.push(
    hasDefault ? `export default __mod.default;` : `export default __mod;`,
  );

  for (const exportName of namedExports) {
    if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(exportName)) {
      lines.push(
        `export const ${exportName} = __mod[${JSON.stringify(exportName)}];`,
      );
    }
  }

  return lines.join("\n");
};

/**
 * Builds and resolves cached dependency bundles for a rolldown build.
 *
 * Key property: when a cached package itself imports another package that
 * `isExternal` also matches (e.g. a UI lib importing "react"), that nested
 * import is NOT inlined into the package's bundle. It's resolved through
 * this same cache, so every consumer — the app and every cached dep alike —
 * shares exactly one built copy of "react". That's what prevents duplicate-
 * React ("Invalid hook call" / "Cannot read properties of null (reading
 * 'useContext')") bugs.
 */
class DepCache {
  private manifest: Manifest;
  private inflight = new Map<string, Promise<string | null>>();
  private building = new Set<string>();

  constructor(
    private cacheDir: string,
    private isExternal: (id: string) => boolean,
    private define: Record<string, string> | undefined,
    private publicPath: string,
  ) {
    fs.mkdirSync(cacheDir, { recursive: true });
    this.manifest = readManifest(cacheDir);
  }

  /** Resolves `source` (imported from `importerDir`) to a cache filename, building if needed.
   *  Returns null if `source` isn't resolvable as a real filesystem module (e.g. a virtual id
   *  another plugin owns) — caller should defer to the rest of the plugin chain in that case. */
  resolveFile(source: string, importerDir: string): Promise<string | null> {
    let p = this.inflight.get(source);
    if (!p) {
      p = this.build(source, importerDir);
      this.inflight.set(source, p);
    }
    return p;
  }

  private async build(
    source: string,
    importerDir: string,
  ): Promise<string | null> {
    let resolved: string;
    try {
      resolved = require.resolve(source, { paths: [importerDir] });
    } catch {
      return null; // not a real module on disk — not ours to handle
    }
    const key = fingerprint(resolved);
    const cached = this.manifest[source];

    if (
      cached &&
      cached.key === key &&
      fs.existsSync(path.join(this.cacheDir, cached.file))
    ) {
      return cached.file;
    }

    const entryName = entryNameFor(source);
    const hash = crypto
      .createHash("sha1")
      .update(resolved + key)
      .digest("hex")
      .slice(0, 8);
    const file = `${entryName}.${hash}.js`;
    const outFile = path.join(this.cacheDir, file);

    // Guard against circular "cached package A imports cached package B
    // imports A" — fall back to inlining on the cycle edge instead of
    // deadlocking on inflight promises.
    const isCycle = this.building.has(source);
    this.building.add(source);
    try {
      await this.bundle(source, resolved, outFile, !isCycle);
    } catch (err) {
      console.error(
        `[cache-deps] failed to build "${source}" (${resolved}) — falling back to inline bundling:`,
        err,
      );
      return null; // don't kill the whole build; let rolldown bundle it normally
    } finally {
      this.building.delete(source);
    }

    this.manifest[source] = { source, resolved, file, key };
    writeManifest(this.cacheDir, this.manifest);

    return file;
  }

  private async bundle(
    source: string,
    resolved: string,
    outFile: string,
    dedupeExternals: boolean,
  ) {
    const shimId = `\0cache-deps-shim:${source}`;
    const shimCode = await makeEsmShim(resolved);
    const depDir = path.dirname(resolved);

    const plugin: Plugin = {
      name: "cache-deps-shim",
      resolveId: async (id) => {
        if (id === shimId) return shimId;
        if (id.startsWith(".") || id.startsWith("/") || path.isAbsolute(id)) {
          return null; // let rolldown resolve relative/internal files of the package normally
        }
        if (nodeBuiltins.has(id)) {
          return { id, external: true };
        }
        if (isVirtualId(id)) {
          return null;
        }
        if (dedupeExternals && this.isExternal(id)) {
          // Route to the shared cache entry instead of bundling a second copy.
          const file = await this.resolveFile(id, depDir);
          if (file === null) return null;
          return { id: this.publicPath + file, external: true };
        }
        return null; // inline this transitive dep (not shared/singleton)
      },
      load(id) {
        if (id === shimId) return shimCode;
        return null;
      },
    };

    const bundle = await rolldown({
      input: shimId,
      platform: "browser",
      transform: {
        target: "es2022",
        jsx: {
          runtime: "automatic",
        },
        define: this.define,
      },
      plugins: [plugin],
    });

    await bundle.write({
      file: outFile,
      format: "esm",
      sourcemap: true,
    });

    await bundle.close();
  }
}

export const cacheDepsPlugin = (options: CacheDepsPluginOptions): Plugin => {
  const { cacheDir, isExternal, define, debug = false } = options;
  const publicPath = options.publicPath ?? "/__cache__/";
  const cache = new DepCache(cacheDir, isExternal, define, publicPath);
  const log = (...args: unknown[]) => {
    if (debug) console.log("[cache-deps]", ...args);
  };

  log("initialized, cacheDir =", cacheDir);

  return {
    name: "xanix-cache-deps",

    async resolveId(source, importer) {
      if (!importer) {
        log("skip (entry point):", source);
        return null; // entry points aren't deps
      }
      if (
        source.startsWith(".") ||
        source.startsWith("/") ||
        path.isAbsolute(source)
      ) {
        return null; // relative/absolute — too noisy to log every one of these
      }
      if (nodeBuiltins.has(source)) {
        return { id: source, external: true };
      }
      if (isVirtualId(source)) {
        log("skip (virtual id):", source);
        return null; // owned by another plugin (virtual:, \0, etc.) — don't touch it
      }
      if (!isExternal(source)) {
        log("skip (isExternal() = false):", source);
        return null; // let it bundle normally into the main output
      }

      log("caching:", source, "from", importer);
      const file = await cache.resolveFile(source, path.dirname(importer));
      if (file === null) {
        log("build failed, falling back to inline:", source);
        return null; // couldn't resolve as a real module — defer to others
      }

      log("cached ->", file);
      return { id: publicPath + file, external: true };
    },
  };
};

export default cacheDepsPlugin;
