import path from "node:path";
import fs from "node:fs";
import type { FileRoute } from "../code/scanFileRoutes.js";
import { scanFileRoutes } from "../code/scanFileRoutes.js";
import outdirs from "../outdirs.js";

export const appRouteManifestFile = path.join(
  process.cwd(),
  outdirs.root,
  "app-route-manifest.json",
);

export const generateAppRouteManifest = async (): Promise<FileRoute[]> => {
  const routes = await scanFileRoutes(path.join(process.cwd(), "app"));

  await fs.promises.mkdir(path.dirname(appRouteManifestFile), {
    recursive: true,
  });

  const tempFile = `${appRouteManifestFile}.${process.pid}.tmp`;

  await fs.promises.writeFile(
    tempFile,
    JSON.stringify(routes, null, 2),
    "utf8",
  );

  await fs.promises.rename(tempFile, appRouteManifestFile);

  return routes;
};

export const getAppRouteManifest = async (): Promise<FileRoute[]> => {
  try {
    const content = await fs.promises.readFile(appRouteManifestFile, "utf8");

    return JSON.parse(content) as FileRoute[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return generateAppRouteManifest();
    }

    if (error instanceof SyntaxError) {
      return generateAppRouteManifest();
    }

    throw error;
  }
};
