import fs from "fs/promises";
import outdirs from "../../../outdirs.js";
import type { CachedMap, CachedModule } from "./types.js";

const manifestFile = `${outdirs.module_cache}/manifest.json`;

export const writeManifest = async (manifest: CachedMap) => {
  const data: CachedModule[] = Array.from(manifest.values());
  for (const item of data) {
    delete (item as any).exports;
    delete (item as any).default;
    delete (item as any).resolved;
    delete (item as any).name;
  }
  await fs.writeFile(manifestFile, JSON.stringify(data, null, 2), "utf-8");
};

export const readManifest = async (): Promise<CachedMap> => {
  try {
    const content = await fs.readFile(manifestFile, "utf-8");
    const parsed: CachedModule[] = JSON.parse(content);
    let data: CachedMap = new Map();
    for (let p of parsed) {
      data.set(p.module, p);
    }
    return data;
  } catch {
    return new Map();
  }
};
