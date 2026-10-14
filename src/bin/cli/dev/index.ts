import path from "node:path";
import fs from "node:fs";
import startWebSocketServer from "./ws.js";
import watchServer from "../../bundler/server/watch.js";
import { RolldownWatcher } from "rolldown";
import watchClient from "../../bundler/client/watch.js";
import pc from "picocolors";
import logger from "../../include/logger.js";
import outdirs from "../../../outdirs.js";
import {
  getFrameworkPackageJson,
  normalizePath,
  ensureOutdir,
} from "../../include/utils.js";
import { startServer } from "./server.js";
import { generateAppRouteManifest } from "../../include/routes.js";
import { watchGroup } from "../../include/WatchGroup.js";
import ServerWatchConfig from "../../bundler/server/watch.config.js";

const root = normalizePath(process.cwd());

const dev = async (rootEntry: string) => {
  const packageJson = await getFrameworkPackageJson();
  await ensureOutdir();
  await generateAppRouteManifest();

  const broadcast = startWebSocketServer();
  console.log("");
  console.log(pc.green(pc.bold(`Xanix`) + ` v${packageJson.version}`));

  let clientWatcher: RolldownWatcher | null = null;
  let clientStarted = false;
  let buildDuration = 0;
  let initial = false;

  watchGroup(
    {
      server: await ServerWatchConfig(),
    },
    {
      onChange: ({ id, event, watchers, shared }) => {
        console.log(
          event,
          id,
          shared ? "BOTH" : `only ${watchers[0]}`,
          watchers,
        );
      },
    },
  );

  return;

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
              console.log(`${pc.green("○")} ${pc.dim(filepath)}`);
            }
            console.log("");
          }
        }
        await startServer();
        initial = true;
        buildDuration = 0;
        clientStarted = false;
      },
      onChange: async (files, duration, moduleToChunk, assets) => {
        buildDuration += duration;
        clientStarted = false;

        const _files = [];
        for (let file of files) {
          const ext = path.extname(file);
          const isCss = ext === ".css";
          if (isCss) {
            const asset = Array.from(assets.values()).find(
              (a) => a.path === file,
            );
            _files.push(`/assets/${asset?.name}`);
          } else {
            const chunk = moduleToChunk.get(file);
            if (!chunk) {
              continue;
            }
            _files.push(chunk);
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
      // await startClientWatcher();
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
