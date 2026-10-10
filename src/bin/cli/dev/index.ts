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
import spinner from "../../include/spinner.js";

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
  let initial = false;

  const startClientWatcher = async () => {
    clientWatcher?.close();
    clientWatcher = await watchClient({
      onStart: async () => {
        clientStarted = true;
      },
      onReady: async (duration, entries) => {
        if (!initial) {
          if (entries.length > 0) {
            console.log("");
            console.log(pc.bold(`Pages (${entries.length})`));

            for (const entry of entries) {
              const filepath = entry.resolved.replace(
                normalizePath(process.cwd()) + "/",
                "",
              );
              console.log(` ${pc.dim(filepath)}`);
            }
            console.log("");
          }
        }
        await startServer();
        initial = true;
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

  // spinner.start("Starting development server...");

  const watch = await watchServer({
    rootEntry,
    onChangeManifest: async (newEntries, type) => {
      if (newEntries.length > 0) {
        for (const entry of newEntries) {
          const filepath = entry.resolved.replace(
            normalizePath(process.cwd()) + "/",
            "",
          );
          logger.info(`${pc.yellow(filepath)}`, `[${type}]`);
        }
      }
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
