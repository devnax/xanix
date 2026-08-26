import path from "node:path";
import { spawn } from "node:child_process";
import watchServer from "../bundler/watchServer.js";
import { RollupWatcher } from "rollup";
import watchClient from "../bundler/watchClient.js";
import pc from "picocolors";
import logger from "../include/logger.js";
import { getEntries } from "../include/entry.js";
import { outDir } from "../bundler/config/output.js";
import { WebSocketServer } from "ws";

const root = process.cwd();
let child: any;

// function start(loggin = true) {
//   const filePath = path.join(outDir.server, "index.js");
//   child = spawn(process.execPath, [filePath], {
//     stdio: loggin ? "inherit" : "pipe",
//   });
// }

function start(logging = true): Promise<any> {
  return new Promise((resolve, reject) => {
    const filePath = path.join(outDir.server, "index.js");
    child = spawn(process.execPath, [filePath], {
      stdio: logging ? "inherit" : "pipe",
    });
    resolve(child);
  });
}

async function restart(logging = false) {
  child?.kill();
  await start(logging);
}

const dev = async (rootEntry: string) => {
  let clientWatcher: RollupWatcher | null = null;
  let firstBuild = true;

  const wss = new WebSocketServer({
    port: 8080,
  });

  let sockets = new Set<any>();

  const broadcast = (message: string) => {
    sockets.forEach((socket: any) => {
      if (socket.readyState === 1) {
        socket.send(message);
      }
    });
  };

  wss.on("connection", (ws) => {
    sockets.add(ws);
    ws.on("close", () => {
      sockets.delete(ws);
    });
  });

  const watch = await watchServer({
    rootEntry,
    onChange: async (entry, event) => {
      logger.info(
        `reload server ${pc.yellow(entry.replace(root.replaceAll("\\", "/"), ""))}`,
        event ?? "update",
      );
    },
    async onClientChange() {
      await restart(false);
      setTimeout(() => {
        broadcast("reload");
      }, 100);
    },
    async onClientEntryChange() {
      const entries = await getEntries();
      clientWatcher?.close();
      clientWatcher = await watchClient(entries);
    },
    onBuildEnd: async () => {
      if (firstBuild) {
        firstBuild = false;
        const entries = await getEntries();
        clientWatcher = await watchClient(entries);
        await start();
      } else {
        await restart();
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
