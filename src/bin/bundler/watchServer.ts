import { watch } from "rollup";
import path from "node:path";
import fs from "node:fs";
import external from "./config/external.js";
import { getEntries } from "../include/manifest.js";
import { XanixClientEntry } from "../types.js";
import bundlerOutput from "./config/output.js";
import { entriesEqual } from "../include/entry.js";
import { xanixDefaultPlugins } from "./plugins/plugins.js";
import outdirs from "../../outdirs.js";
import { normalizePath } from "../include/utils.js";
import { builtinModules } from "node:module";
import { tsconfigPathsMatcher } from "./plugins/XanixTsconfigAlias.js";
const root = process.cwd();
const nodeBuiltins = new Set(builtinModules);

function isNodeBuiltin(id: string): boolean {
  const normalized = id.startsWith("node:") ? id.slice(5) : id;
  return nodeBuiltins.has(normalized);
}

const forcedExternalPackages = new Set(["express"]);

function packageNameOf(id: string): string {
  const parts = id.split("/");

  if (id.startsWith("@")) {
    return parts.slice(0, 2).join("/");
  }

  return parts[0];
}

function shouldExternal(id: string): boolean {
  if (
    id.startsWith(".") ||
    path.isAbsolute(id) ||
    id.startsWith("xanix") ||
    id === "virtual:xanix-document" ||
    tsconfigPathsMatcher(id)
  ) {
    return false;
  }

  if (id.startsWith("\0")) {
    return false;
  }

  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(id) && !id.startsWith("node:")) {
    return false;
  }

  if (isNodeBuiltin(id)) {
    return true;
  }

  return forcedExternalPackages.has(packageNameOf(id));
}

export type WatcherOptions = {
  rootEntry: string;
  onChange?: (files: string[], entries: XanixClientEntry[]) => Promise<void>;
  onBuildEnd?: (duration: number) => void;
  onClientEntryChange: (
    id: string,
    entries: XanixClientEntry[],
  ) => Promise<void>;
  onReady?: (entries: XanixClientEntry[]) => Promise<void>;
};

const watchServer = async ({
  rootEntry,
  onChange,
  onBuildEnd,
  onClientEntryChange,
  onReady,
}: WatcherOptions) => {
  fs.rmSync(outdirs.server, {
    recursive: true,
    force: true,
  });

  fs.mkdirSync(outdirs.server, {
    recursive: true,
  });

  const input = {
    index: path.resolve(root, rootEntry),
  };

  const watcher = watch({
    input,
    treeshake: true,
    plugins: [
      ...xanixDefaultPlugins({
        target: "server",
        development: true,
        assetExternal: false,
      }),
    ],

    external(id) {
      if (!external(id)) {
        return false;
      }

      return true;
    },

    output: bundlerOutput.server({ isDev: true }),
    watch: {
      clearScreen: false,
    },
  });

  let isReady = false;

  const changedFiles = new Set<string>();
  watcher.on("change", async (id) => {
    changedFiles.add(normalizePath(id));
  });

  watcher.on("event", async (event) => {
    switch (event.code) {
      case "BUNDLE_END":
        onBuildEnd?.(event.duration);
        break;
      case "END":
        const entries = await getEntries();
        if (changedFiles.size) {
          if (entries.length) {
            const clientEntries = Array.from(entries);
            for (const entry of changedFiles) {
              const isClientEntry = clientEntries.find((e) => e.file === entry);
              if (!isClientEntry) {
                const entries = await getEntries();
                const isEqual = await entriesEqual(entries);
                if (!isEqual) {
                  await onClientEntryChange?.(entry, entries);
                }
              }
            }
          }
          await onChange?.(
            Array.from(changedFiles).map((file) =>
              file.replace(normalizePath(root), ""),
            ),
            entries,
          );
          changedFiles.clear();
        }
        if (!isReady) {
          isReady = true;
          await onReady?.(entries);
        }
        break;
      case "ERROR":
        console.error("[server]", event.error);
        break;
    }
  });

  return watcher;
};

export default watchServer;
