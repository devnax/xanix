import { type RollupWatcher } from "rollup";
import path from "node:path";
import fs from "node:fs";
import { spawn } from "node:child_process";
import type { ClientEntry } from "./clientDetector.js";
import WatchServer from "./WatchServer.js";
import WatchClient from "./WatchClient.js";

const root = process.cwd();

let child: any;
function start() {
  const filePath = path.join(root, ".xanix/server/index.js");
  child = spawn(process.execPath, [filePath], {
    stdio: "inherit",
  });
}

function restart() {
  child?.kill();
  start();
}

const dev = async () => {
  const outputDir = path.resolve(root, ".xanix");
  const entries = new Map<string, ClientEntry>();
  let clientWatcher: RollupWatcher | null = null;
  let firstBuild = true;

  /*
   * Clean previous build.
   */
  fs.rmSync(outputDir, {
    recursive: true,
    force: true,
  });

  fs.mkdirSync(outputDir, {
    recursive: true,
  });

  const entriesEqual = (
    a: Map<string, ClientEntry>,
    b: Map<string, ClientEntry>,
  ) => {
    if (a.size !== b.size) {
      return false;
    }

    for (const [key, entry] of a) {
      const other = b.get(key);

      if (!other) {
        return false;
      }

      if (
        entry.component !== other.component ||
        entry.importer !== other.importer ||
        entry.source !== other.source
      ) {
        return false;
      }
    }

    return true;
  };

  const serverWatcher = WatchServer({
    onBuildEnd(nextEntries) {
      const changed = !entriesEqual(entries, nextEntries);
      if (changed) {
        entries.clear();
        for (const [key, entry] of nextEntries) {
          entries.set(key, entry);
        }
        if (clientWatcher) {
          clientWatcher.close();
          clientWatcher = null;
        }

        if (entries.size > 0) {
          clientWatcher = WatchClient(entries);
        }
      }

      if (firstBuild) {
        firstBuild = false;
        start();
        console.log("Server is running on http://localhost:3000");
      } else {
        restart();
      }
    },
  });

  process.on("SIGINT", () => {
    child?.kill();
    serverWatcher?.close();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    child?.kill();
    serverWatcher?.close();
    process.exit(0);
  });
};

export default dev;
