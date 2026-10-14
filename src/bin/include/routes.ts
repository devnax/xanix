import path from "node:path";
import type { FileRoute } from "../libs/scanFileRoutes.js";
import { scanFileRoutes } from "../libs/scanFileRoutes.js";
import outdirs from "../../outdirs.js";
import fs from "node:fs";

const appRouteManifestFile = path.join(outdirs.root, "app-route-manifest.json");
let modifiedTime: number | null = null;
export const generateAppRouteManifest = async () => {
  const scane = await scanFileRoutes(path.join(process.cwd(), "app"));
  await fs.promises.writeFile(
    appRouteManifestFile,
    JSON.stringify(scane, null, 2),
  );
  modifiedTime = Date.now();
  return scane;
};

export const getAppRouteManifest = async () => {
  const content = await fs.promises.readFile(appRouteManifestFile, "utf-8");
  return JSON.parse(content) as FileRoute[];
};

export const isChanged = async () => {
  if (modifiedTime === null) {
    return true;
  }
  const stats = await fs.promises.stat(appRouteManifestFile);
  return stats.mtimeMs > modifiedTime;
};
