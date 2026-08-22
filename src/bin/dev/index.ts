import { watch } from "rollup";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import esbuild from "rollup-plugin-esbuild";
import path from "node:path";
import fs from "node:fs";
import type { ClientEntry } from "./clientDetector.js";
import WatchServer from "./WatchServer.js";
import WatchClient from "./WatchClient.js";

const root = process.cwd();

const dev = async () => {
  const outputDir = path.resolve(root, ".xanix");

  fs.rmSync(outputDir, {
    recursive: true,
    force: true,
  });

  fs.mkdirSync(outputDir, {
    recursive: true,
  });

  const entries = new Map<string, ClientEntry>();
  let clientWatcher: ReturnType<typeof watch> | null = null;
  const watcher = await WatchServer({
    onBuildEnd(nextEntries) {
      const changed =
        entries.size !== nextEntries.size ||
        [...entries.keys()].some((key) => !nextEntries.has(key));

      if (!changed) {
        return;
      }

      console.log("Client entries changed.");
      entries.clear();
      for (const [key, entry] of nextEntries) {
        entries.set(key, entry);
      }
      clientWatcher?.close();
      clientWatcher = WatchClient(entries);
    },
  });
};

export default dev;
