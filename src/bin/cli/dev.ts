import path from "node:path";
import { spawn } from "node:child_process";
import watchServer from "../bundler/watchServer.js";
import { RollupWatcher } from "rollup";
import watchClient from "../bundler/watchClient.js";
import pc from "picocolors";
import logger from "../include/logger.js";
import { WebSocketServer } from "ws";
import { XanixClientEntry } from "../types.js";
import outdirs from "../../outdirs.js";
import { getWebSocketPort } from "../include/utils.js";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import spinner from "../include/spinner.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageJson = JSON.parse(
  await readFile(path.join(__dirname, "../../../package.json"), "utf8"),
);

const serverInfo: { port?: number; url?: string } = {};
let child: any;
let firstStart = false;
let serverDuration = 0;
let clientDuration = 0;

const curl = () => {
  return new Promise<void>((resolve, reject) => {
    const child = spawn("curl", [serverInfo.url!], {
      stdio: "pipe",
    });
    child.on("error", reject);
    child.on("close", () => resolve());
  });
};

function runStart(): Promise<void> {
  return new Promise((resolve, reject) => {
    child?.kill();
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
          console.log(`  ${pc.blue("➜ Local:")} ${pc.yellow(serverInfo.url)}`);
          console.log("");
          console.log(
            pc.green(`Ready in ${serverDuration + clientDuration}ms`),
          );
          console.log("");
        }
        resolve();
      }
    });

    child.on("error", reject);
  });
}

async function startServer() {
  await runStart();
  await curl();
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
  });

  let clientChangeFiles: string[] = [];
  let _clientWatcher: RollupWatcher | null = null;

  const clientWatcher = async (entries: XanixClientEntry[]) => {
    spinner.start("Compiling Client...");

    _clientWatcher?.close();
    _clientWatcher = await watchClient(entries, {
      WebSocketPort,
      onReady: async () => {
        spinner.stop(
          `${pc.green("✓")} Client compiled in ${pc.dim(clientDuration + "ms")}`,
        );
        await startServer();
      },
      onChange: async (files) => {
        clientChangeFiles = files;
      },
      onBuildEnd(duration) {
        clientDuration += duration;
      },
    });
  };
  console.log("");
  console.log(pc.bold(`Xanix ${packageJson.version}`));
  console.log("");

  spinner.start("Compiling Server...");

  const watch = await watchServer({
    rootEntry,
    onReady: async (entries: XanixClientEntry[]) => {
      spinner.stop(
        `${pc.green("✓")} Server compiled in ${pc.dim(serverDuration + "ms")}`,
      );
      await clientWatcher(entries);
    },
    onChange: async (files) => {
      await startServer();
      if (clientChangeFiles.length) {
        broadcast(JSON.stringify(clientChangeFiles));
      }
      logger.info(`${pc.yellow(files.join(", "))}`, "[update]");

      clientChangeFiles = [];
    },
    onClientEntryChange: async (
      _entry: string,
      entries: XanixClientEntry[],
    ) => {
      await clientWatcher(entries);
    },
    onBuildEnd(duration) {
      serverDuration += duration;
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
