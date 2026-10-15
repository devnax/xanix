import startWebSocketServer from "./ws.js";
import pc from "picocolors";
import { getFrameworkPackageJson, ensureOutdir } from "../../include/utils.js";
import { startServer } from "./server.js";
import { watchGroup } from "../../include/WatchGroup.js";
import ServerWatchConfig from "../../bundler/server/watch.config.js";
import ClientWatchConfig from "../../bundler/client/watch.config.js";
import manifestWatch from "./manifest.js";

const dev = async (rootEntry: string) => {
  await ensureOutdir();
  const packageJson = await getFrameworkPackageJson();
  const broadcast = startWebSocketServer();
  console.log("");
  console.log(pc.green(pc.bold(`Xanix`) + ` v${packageJson.version}`));

  const manifestWatcher = await manifestWatch();

  const watcher = watchGroup(
    {
      server: await ServerWatchConfig(),
      client: await ClientWatchConfig(),
    },
    {
      onEnd: async () => {
        await startServer();
      },
      onChange: async ({ id, event, watchers, shared }) => {
        // console.log(
        //   event,
        //   id,
        //   shared ? "BOTH" : `only ${watchers[0]}`,
        //   watchers,
        // );
        await startServer();
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
