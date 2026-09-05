import path from "node:path";
import { spawn } from "node:child_process";
import watchServer from "../bundler/watchServer.js";
import { RollupWatcher } from "rollup";
import watchClient from "../bundler/watchClient.js";
import { getEntries } from "../include/manifest.js";
import pc from "picocolors";
import logger from "../include/logger.js";
import { WebSocketServer } from "ws";
import { XanixClientEntry } from "../types.js";
import outdirs from "../../outdirs.js";
import { getWebSocketPort } from "../include/utils.js";

let child: any;
function start(): Promise<void> {
  return new Promise((resolve, reject) => {
    child?.kill();
    const filePath = path.join(outdirs.server, "index.js");
    child = spawn(process.execPath, [filePath], {
      stdio: ["inherit", "inherit", "inherit", "ipc"],
    });

    child.on("message", (message: any) => {
      console.log(message);

      if (message.type === "xanix:ready") {
        resolve();
      }
    });

    child.on("error", reject);

    // child.on("exit", (code, signal) => {
    //   if (code !== 0) {
    //     reject(
    //       new Error(`Xanix server exited with code ${code}, signal ${signal}`),
    //     );
    //   }
    // });
  });
}

const dev = async (rootEntry: string) => {
  const WebSocketPort = getWebSocketPort();
  const wss = new WebSocketServer({
    port: WebSocketPort,
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

    ws.on("message", (message) => {
      if (message.toString() === "reload") {
        // start();
      }
    });
  });

  let reloadedClient = false;
  let clientChangeFiles: string[] = [];
  let serverChangeFiles: string[] = [];
  let _clientWatcher: RollupWatcher | null = null;

  const clientWatcher = async (entries: XanixClientEntry[]) => {
    _clientWatcher?.close();
    _clientWatcher = await watchClient(entries, {
      WebSocketPort,
      onReady: async () => {
        await start();
      },
      onChange: async (files) => {
        if (!serverChangeFiles.length) {
          clientChangeFiles = files;
          await start();
          broadcast(JSON.stringify(files));
          logger.info(
            `Reloaded files: ${pc.yellow(files.join(", "))}`,
            "update",
          );
        }
        serverChangeFiles = [];
      },
    });
  };

  const watch = await watchServer({
    rootEntry,
    onReady: async (entries: XanixClientEntry[]) => {
      await clientWatcher(entries);
    },
    onChange: async (files, entries) => {
      if (!clientChangeFiles.length) {
        serverChangeFiles = files;
        await start();
        logger.info(`reload server ${pc.yellow(files.join(", "))}`, "update");
      }
      clientChangeFiles = [];
    },
    onClientEntryChange: async (
      _entry: string,
      entries: XanixClientEntry[],
    ) => {
      await clientWatcher(entries);
    },
  });

  process.on("SIGINT", () => {
    child?.kill();
    _clientWatcher?.close();
    watch?.close();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    child?.kill();
    _clientWatcher?.close();
    watch?.close();
    process.exit(0);
  });
};

export default dev;
