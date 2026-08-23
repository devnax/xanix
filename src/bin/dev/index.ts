import path from "node:path";
import fs from "node:fs";
import { spawn } from "node:child_process";
import WatchServer from "./WatchServer.js";

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
  const serverDir = path.resolve(root, ".xanix");

  fs.rmSync(serverDir, {
    recursive: true,
    force: true,
  });

  fs.mkdirSync(serverDir, {
    recursive: true,
  });
  let firstBuild = true;
  const watch = WatchServer({
    onBuildEnd: (entries) => {
      if (firstBuild) {
        firstBuild = false;
        start();
      } else {
        restart();
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
