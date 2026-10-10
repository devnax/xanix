import path from "node:path";
import fs from "node:fs";
import startWebSocketServer from "./ws.js";
import watchServer from "../../bundler/server/watch.js";
import { RolldownWatcher } from "rolldown";
import watchClient from "../../bundler/client/watch.js";
import pc from "picocolors";
import logger from "../../include/logger.js";
import outdirs from "../../../outdirs.js";
import { getFrameworkPackageJson, normalizePath } from "../../include/utils.js";
import { startServer } from "./server.js";

const root = normalizePath(process.cwd());

const dev = async (rootEntry: string) => {
  // await stop();
  const packageJson = await getFrameworkPackageJson();

  fs.rmSync(outdirs.root, {
    recursive: true,
    force: true,
  });

  fs.mkdirSync(outdirs.root, {
    recursive: true,
  });
  const broadcast = startWebSocketServer();
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
        await startServer();
      }
    },
  });

  process.on("SIGINT", () => {
    clientWatcher?.close();
    watch?.close();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    clientWatcher?.close();
    watch?.close();
    process.exit(0);
  });
};

export default dev;
