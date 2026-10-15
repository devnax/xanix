import chokidar from "chokidar";
import { generateAppRouteManifest } from "../../include/manifest/routes.js";

const manifestWatcher = async () => {
  await generateAppRouteManifest();

  const watcher = chokidar.watch("app", {
    ignoreInitial: true,
  });

  watcher.on("all", (event, path) => {
    // only call when add or remove and file name must be route.* page.* middleware.* or layout.*
    if (event === "add" || event === "unlink") {
      if (
        path.match(/route\..*$/) ||
        path.match(/page\..*$/) ||
        path.match(/middleware\..*$/) ||
        path.match(/layout\..*$/) ||
        path.match(/props\..*$/)
      ) {
        generateAppRouteManifest();
      }
    }
  });

  return watcher;
};

export default manifestWatcher;
