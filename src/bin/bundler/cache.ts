import path from "node:path";
import fs from "node:fs";
import { rolldown, watch } from "rolldown";
import type { Plugin } from "rolldown";

const root = process.cwd();

const appEntry = path.resolve(root, "src/index.ts");
const outDir = path.resolve(root, ".xanix");

const cacheDir = path.join(outDir, "cache");

function normalize(id: string) {
  return id.replace(/\\/g, "/");
}

function isNodeModule(id: string) {
  return normalize(id).includes("/node_modules/");
}

function getPackageName(id: string) {
  const normalized = normalize(id);

  const match = normalized.match(/\/node_modules\/((?:@[^/]+\/)?[^/]+)/);

  if (!match) {
    return null;
  }

  return match[1];
}

function getSafeEntryName(packageName: string) {
  return packageName
    .replace(/^@/, "")
    .replace(/\//g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "-");
}

/**
 * Finds the package root from a node_modules file.
 */
function getPackageRoot(id: string) {
  const normalized = normalize(id);

  const index = normalized.lastIndexOf("/node_modules/");

  if (index === -1) {
    return null;
  }

  const after = normalized.slice(index + "/node_modules/".length);

  const parts = after.split("/");

  if (parts[0].startsWith("@")) {
    if (!parts[1]) {
      return null;
    }

    return path.join(
      normalized.slice(0, index),
      "node_modules",
      parts[0],
      parts[1],
    );
  }

  return path.join(normalized.slice(0, index), "node_modules", parts[0]);
}

/**
 * Plugin used only to discover node_modules dependencies.
 */
function discoverDependencies() {
  const dependencies = new Map<string, string>();

  const plugin: Plugin = {
    name: "xanix-discover-dependencies",

    resolveId(source, importer) {
      if (!importer) {
        return null;
      }

      return null;
    },

    load(id) {
      if (!isNodeModule(id)) {
        return null;
      }

      const packageName = getPackageName(id);

      if (!packageName) {
        return null;
      }

      if (!dependencies.has(packageName)) {
        dependencies.set(packageName, id);
      }

      return null;
    },
  };

  return {
    plugin,
    dependencies,
  };
}

/**
 * Build the input object dynamically.
 *
 * IMPORTANT:
 *
 * The dependencies need to become independent entries.
 */
async function createInputs() {
  const discovered = new Map<string, string>();

  const plugin: Plugin = {
    name: "xanix-discover",

    resolveId(source, importer) {
      return null;
    },

    load(id) {
      if (!isNodeModule(id)) {
        return null;
      }

      const packageName = getPackageName(id);

      if (packageName) {
        discovered.set(packageName, id);
      }

      return null;
    },
  };

  /*
   * First build only to discover the dependency graph.
   */
  const discoveryBundle = await rolldown({
    input: appEntry,
    plugins: [plugin],
  });

  await discoveryBundle.generate({
    format: "esm",
  });

  /*
   * Add the application entry.
   */
  const inputs: Record<string, string> = {
    app: appEntry,
  };

  /*
   * Add each discovered npm package as an independent entry.
   */
  for (const [packageName, id] of discovered) {
    const entryName = getSafeEntryName(packageName);

    inputs[`dep_${entryName}`] = id;
  }

  return inputs;
}

/**
 * Cache plugin.
 *
 * This does NOT rebuild the dependencies separately.
 *
 * They are entries in the SAME Rolldown watch.
 */
function xanixCachePlugin(): Plugin {
  return {
    name: "xanix-cache",

    outputOptions(options) {
      return {
        ...options,

        entryFileNames(chunk) {
          if (chunk.name.startsWith("dep_")) {
            const name = chunk.name.slice("dep_".length);

            return `cache/${name}.js`;
          }

          return "[name].js";
        },
      };
    },
  };
}

export async function Caching() {
  fs.mkdirSync(cacheDir, {
    recursive: true,
  });

  /*
   * Discover dependencies once when creating the watch graph.
   */
  const inputs = await createInputs();

  console.log("Rolldown watch entries:");

  for (const [name, value] of Object.entries(inputs)) {
    console.log(`  ${name} → ${value}`);
  }

  /*
   * ONE Rolldown watch.
   *
   * No buildDependencyCache().
   * No external dependency build.
   */
  const watcher = await watch({
    input: inputs,

    plugins: [xanixCachePlugin()],

    output: {
      dir: outDir,
      format: "esm",

      entryFileNames: (chunk) => {
        if (chunk.name.startsWith("dep_")) {
          const name = chunk.name.slice("dep_".length);

          return `cache/${name}.js`;
        }

        return "[name].js";
      },

      chunkFileNames: "chunks/[name]-[hash].js",

      assetFileNames: "assets/[name]-[hash][extname]",
    },

    watch: {
      include: ["src/**", "node_modules/**"],
    },
  });

  watcher.on("event", (event) => {
    switch (event.code) {
      case "START":
        console.log("watch started");
        break;

      case "BUNDLE_START":
        console.log("building...");
        break;

      case "BUNDLE_END":
        console.log(`built in ${event.duration}ms`);
        break;

      case "END":
        console.log("waiting for changes...");
        break;

      case "ERROR":
        console.error(event.error);
        break;
    }
  });
}
