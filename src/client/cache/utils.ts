import fs from "fs/promises";
import { builtinModules } from "node:module";
import type { CachedMap, CachedModule } from "./types.js";
import outdirs from "../../include/outdirs.js";

const nodeBuiltins = new Set(builtinModules);

export function isPackageImport(source: string) {
  if (source.startsWith("./") || source.startsWith("../")) {
    return false;
  }
  if (source.startsWith("/") || /^[A-Za-z]:[\\/]/.test(source)) {
    return false;
  }
  if (
    source.startsWith("node:") ||
    source.includes(":") ||
    source.startsWith("\0")
  ) {
    return false;
  }
  return true;
}

export const makeFilename = (id: string) => {
  let root = process.cwd().replace(/\\/g, "/").replace(/\/+/g, "/");
  id = id
    .trim()
    .replace(/\\/g, "/")
    .replace(/\/+/g, "-")
    .replace(`${root}/`, "")
    .replace("node_modules/", "")
    .toLowerCase()
    .split("?")[0];
  return id;
};

export function isNodeBuiltin(id: string): boolean {
  const normalized = id.startsWith("node:") ? id.slice(5) : id;
  return nodeBuiltins.has(normalized);
}

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
