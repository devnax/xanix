import startWebSocketServer from "./ws.js";
import pc from "picocolors";
import path from "node:path";
import {
  getFrameworkPackageJson,
  ensureOutdir,
  normalize,
} from "../../include/utils.js";
import { startServer } from "./server.js";
import { watchGroup } from "../../include/WatchGroup.js";
import ServerWatchConfig from "../../server/watch.config.js";
import manifestWatch from "./manifest.js";
import ClientWatchConfig from "../../client/config/watch.js";
import { createChunkTracker } from "../../client/plugins/ChunkTracker.js";
import { getAppRouteManifest } from "../../include/manifest/routesManifest.js";
import { getEngineById } from "../../include/routes.js";

const dev = async (rootEntry: string) => {
  await ensureOutdir();
  const packageJson = await getFrameworkPackageJson();
  const broadcast = startWebSocketServer();
  console.log("");
  console.log(pc.green(pc.bold(`Xanix`) + ` v${packageJson.version}`));

  let manifestWatcher = await manifestWatch();
  const tracker = createChunkTracker();
  const watcher = watchGroup(
    {
      server: await ServerWatchConfig(),
      client: await ClientWatchConfig(tracker),
    },
    {
      onReady: async () => {
        await startServer();
      },
      onChange: async ({ id, event, watchers, shared }) => {
        if (watchers.includes("client")) {
          const filename = path.basename(id, path.extname(id));

          let files: { file: string; id: string }[] = [];

          if (["route", "props", "middleware"].includes(filename)) {
            const dir = path.dirname(id);
            const routeManifest = await getAppRouteManifest();
            for (let route of routeManifest) {
              if (route.dir === dir && route.page) {
                id = path.resolve(dir, route.page);
                await startServer();
                console.log("reloaded");

                break;
              }
            }
          }

          const engine = getEngineById(id);

          if (["hbs", "ejs", "pug", "html"].includes(engine)) {
            files.push({
              file: id,
              id: normalize(id),
            });
          } else if (["react", "vue", "svelte"].includes(engine)) {
            const chunks = tracker.getChunksByModule(id);
            chunks
              .map((chunk) => ({
                file: chunk.file,
                id: normalize(id),
              }))
              .forEach((file) => files.push(file));
          }
          broadcast(JSON.stringify(files));
        }
      },
    },
  );

  process.on("SIGINT", () => {
    watcher?.close();
    manifestWatcher?.close();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    watcher?.close();
    manifestWatcher?.close();
    process.exit(0);
  });

  // let clientWatcher: RolldownWatcher | null = null;
  // let clientStarted = false;
  // let buildDuration = 0;
  // let initial = false;
  // const startClientWatcher = async () => {
  //   clientWatcher?.close();
  //   clientWatcher = await watchClient({
  //     onStart: async () => {
  //       clientStarted = true;
  //     },
  //     onReady: async (duration, entries) => {
  //       if (!initial) {
  //         if (entries.length > 0) {
  //           console.log("");
  //           console.log(pc.bold(`Pages (${entries.length})`));

  //           for (const entry of entries) {
  //             const filepath = entry.resolved.replace(
  //               normalizePath(process.cwd()) + "/",
  //               "",
  //             );
  //             console.log(`${pc.green("○")} ${pc.dim(filepath)}`);
  //           }
  //           console.log("");
  //         }
  //       }
  //       await startServer();
  //       initial = true;
  //       buildDuration = 0;
  //       clientStarted = false;
  //     },
  //     onChange: async (files, duration, moduleToChunk, assets) => {
  //       buildDuration += duration;
  //       clientStarted = false;

  //       const _files = [];
  //       for (let file of files) {
  //         const ext = path.extname(file);
  //         const isCss = ext === ".css";
  //         if (isCss) {
  //           const asset = Array.from(assets.values()).find(
  //             (a) => a.path === file,
  //           );
  //           _files.push(`/assets/${asset?.name}`);
  //         } else {
  //           const chunk = moduleToChunk.get(file);
  //           if (!chunk) {
  //             continue;
  //           }
  //           _files.push(chunk);
  //         }
  //       }

  //       files = files.map((file) => file.replace(root + "/", ""));
  //       logger.info(
  //         `${pc.yellow(files.join(", "))} ${pc.green(buildDuration + "ms")}`,
  //         "[update]",
  //       );

  //       broadcast(JSON.stringify(_files));
  //       buildDuration = 0;
  //     },
  //   });
  // };

  // const watch = await watchServer({
  //   rootEntry,
  //   onChangeManifest: async (newEntries, type) => {
  //     if (newEntries.length > 0) {
  //       for (const entry of newEntries) {
  //         const filepath = entry.resolved.replace(
  //           normalizePath(process.cwd()) + "/",
  //           "",
  //         );
  //         logger.info(`${pc.yellow(filepath)}`, `[${type}]`);
  //       }
  //     }
  //     await startClientWatcher();
  //   },
  //   onReady: async (duration) => {
  //     buildDuration += duration;
  //     // await startClientWatcher();
  //   },
  //   onChange: async (files, duration) => {
  //     buildDuration += duration;

  //     if (!clientStarted) {
  //       files = files.map((file) => file.replace(root + "/", ""));
  //       logger.info(
  //         `${pc.yellow(files.join(", "))} ${pc.green(buildDuration + "ms")}`,
  //         "[update]",
  //       );
  //       buildDuration = 0;
  //       await startServer();
  //     }
  //   },
  // });
};

export default dev;
