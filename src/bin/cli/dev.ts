import path from "node:path";
import fs from "node:fs";
import { spawn } from "node:child_process";
import watchServer from "../bundler/server/watch.js";
import { RolldownWatcher } from "rolldown";
import watchClient from "../bundler/client/watch.js";
import pc from "picocolors";
import logger from "../include/logger.js";
import { WebSocketServer } from "ws";
import outdirs from "../../outdirs.js";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { normalizePath } from "../include/utils.js";
import stop from "./stop.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageJson = JSON.parse(
  await readFile(path.join(__dirname, "../../../package.json"), "utf8"),
);

const serverInfo: { port?: number; url?: string } = {};
let child: any;
let firstStart = false;

const root = normalizePath(process.cwd());

const curl = () => {
  return new Promise<void>((resolve, reject) => {
    const child = spawn("curl", [serverInfo.url!], {
      stdio: "pipe",
    });
    child.on("error", reject);
    child.on("close", () => resolve());
  });
};

function runServer(): Promise<void> {
  child?.kill();
  return new Promise((resolve, reject) => {
    const filePath = path.join(outdirs.server, "index.js");
    child = spawn(process.execPath, [filePath], {
      stdio: ["inherit", "inherit", "inherit", "ipc"],
    });

    child.on("message", async (message: any) => {
      if (message.type === "xanix:ready") {
        serverInfo.port = message.port;
        serverInfo.url = message.url;
        if (!firstStart) {
          firstStart = true;
          console.log("");
          console.log(
            `  ${pc.blue("➜ Listening on:")} ${pc.yellow(serverInfo.url)}`,
          );
          console.log("");
        }
        resolve();
      }
    });

    child.on("error", reject);
  });
}

let started = false;
async function startServer() {
  if (!started) {
    await runServer();
    started = true;
  }
}

const dev = async (rootEntry: string) => {
  // await stop();

  fs.rmSync(outdirs.root, {
    recursive: true,
    force: true,
  });

  fs.mkdirSync(outdirs.root, {
    recursive: true,
  });
  const WebSocketPort = 49152;
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
        startServer();
      }
    });
  });

  console.log("");
  console.log(pc.green(pc.bold(`Xanix`) + ` v${packageJson.version}`));

  let clientWatcher: RolldownWatcher | null = null;
  let clientStarted = false;
  let buildDuration = 0;

  const startClientWatcher = async () => {
    clientWatcher?.close();
    clientWatcher = await watchClient({
      onStart: async () => {
        clientStarted = true;
      },
      onReady: async (duration) => {
        await startServer();
        buildDuration = 0;
        clientStarted = false;
      },
      onChange: async (files, duration, entries) => {
        buildDuration += duration;
        clientStarted = false;

        const _files = [];
        for (let file of files) {
          const entry = entries.find((entry) => entry.resolved === file);
          if (entry) {
            _files.push(`${entry.id}.js`);
          } else {
            file = file.replace(root + "/", "");
            file = file.replace(path.extname(file), ".js");
            _files.push(file);
          }
        }

        files = files.map((file) => file.replace(root + "/", ""));
        logger.info(
          `${pc.yellow(files.join(", "))} ${pc.green(buildDuration + "ms")}`,
          "[update]",
        );

        broadcast(JSON.stringify(_files));
        buildDuration = 0;
      },
    });
  };

  const watch = await watchServer({
    rootEntry,
    onChangeManifest: async () => {
      await startClientWatcher();
    },
    onReady: async (duration) => {
      buildDuration += duration;
      await startClientWatcher();
    },
    onChange: async (files, duration) => {
      buildDuration += duration;

      if (!clientStarted) {
        files = files.map((file) => file.replace(root + "/", ""));
        logger.info(
          `${pc.yellow(files.join(", "))} ${pc.green(buildDuration + "ms")}`,
          "[update]",
        );
        buildDuration = 0;
        startServer();
      }
    },
  });

  process.on("SIGINT", () => {
    clientWatcher?.close();
    watch?.close();
    child?.kill();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    clientWatcher?.close();
    watch?.close();
    child?.kill();
    process.exit(0);
  });
};

export default dev;
