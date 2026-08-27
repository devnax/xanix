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
import { XanixClientEntry } from "../types.js";

const root = process.cwd();
let child: any;

function start(): Promise<any> {
  child?.kill();
  return new Promise((resolve, reject) => {
    const filePath = path.join(outDir.server, "index.js");
    child = spawn(process.execPath, [filePath], {
      stdio: !child ? "inherit" : "pipe",
    });
    resolve(child);
  });
}

const dev = async (rootEntry: string) => {
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

  let firstBuild = true;
  let _clientWatcher: RollupWatcher | null = null;

  const clientWatcher = async (entries: XanixClientEntry[]) => {
    let changedFiles = new Set<string>();
    _clientWatcher?.close();
    _clientWatcher = await watchClient(entries, {
      onChange: (entry) => {
        const _entry = entries.find((e) => e.file === entry);
        let buildFile = _entry
          ? `${_entry.id}.js`
          : entry
              .replace(root.replaceAll("\\", "/"), "")
              .replace(/\.(ts|tsx|jsx)$/, ".js")
              // replace / from first character if exists
              .replace(/^\//, "");
        changedFiles.add(buildFile);
      },
      onBuildEnd: () => {
        if (changedFiles.size) {
          broadcast(JSON.stringify(Array.from(changedFiles)));
          changedFiles.clear();
        }
      },
    });
  };

  const watch = await watchServer({
    rootEntry,
    onChange: async (entry, event) => {
      logger.info(
        `reload server ${pc.yellow(entry.replace(root.replaceAll("\\", "/"), ""))}`,
        event ?? "update",
      );
    },
    async onClientEntryChange(_entry: string, entries: XanixClientEntry[]) {
      await clientWatcher(entries);
    },
    onBuildEnd: async () => {
      if (firstBuild) {
        firstBuild = false;
        const entries = await getEntries();
        await clientWatcher(entries);
      }
      setTimeout(async () => {
        await start();
      }, 400);
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
