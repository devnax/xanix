import path from "node:path";
import fs from "node:fs";
import outdirs from "../outdirs.js";

let manifest: any[] = [];

export const createManifest = async (entries: any[]) => {
  manifest = entries;
  const outDir = path.resolve(process.cwd(), outdirs.root);
  fs.writeFileSync(
    path.resolve(outDir, "client-manifest.json"),
    JSON.stringify(entries, null, 2),
  );
};

export const getManifest = async (): Promise<any[]> => {
  const manifestPath = path.resolve(
    process.cwd(),
    outdirs.root,
    "client-manifest.json",
  );

  if (fs.existsSync(manifestPath)) {
    const content = await fs.promises.readFile(manifestPath, "utf-8");
    return JSON.parse(content);
  }
  return [];
};
