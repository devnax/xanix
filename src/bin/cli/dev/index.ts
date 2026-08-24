import path from "node:path";
import { spawn } from "node:child_process";
import WatchServer from "./WatchServer.js";
import { RollupWatcher } from "rollup";
import {
  generateClientEntries,
  getEntries,
} from "../../include/clientEntry.js";
import { createManifest } from "../../include/manifest.js";
import WatchClient from "./WatchClient.js";
const root = process.cwd();
let child: any;

function start() {
  const filePath = path.join(root, ".xanix", "index.js");
  child = spawn(process.execPath, [filePath], {
    stdio: "inherit",
  });
}

function restart() {
  child?.kill();
  start();
}

const dev = async () => {
  let clientWatcher: RollupWatcher | null = null;
  let firstBuild = true;

  const watch = await WatchServer({
    async onClientChange() {},
    async onClientEntryChange() {
      const entries = await getEntries();
      clientWatcher = await WatchClient(entries);
    },
    async onServerChange() {
      restart();
    },
    onBuildEnd: async () => {
      if (firstBuild) {
        firstBuild = false;
        const entries = await getEntries();
        clientWatcher = await WatchClient(entries);
        start();
      }
    },
  });

  process.on("SIGINT", () => {
    child?.kill();
    watch?.close();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    child?.kill();
    watch?.close();
    process.exit(0);
  });
};

export default dev;
