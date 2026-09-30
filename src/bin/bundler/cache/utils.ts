import fs from "fs";
import path from "path";

export function isPackageImport(source: string) {
  // Relative import
  if (source.startsWith("./") || source.startsWith("../")) {
    return false;
  }
  // Absolute filesystem path
  if (source.startsWith("/") || /^[A-Za-z]:[\\/]/.test(source)) {
    return false;
  }
  // URL / virtual module
  if (
    source.startsWith("node:") ||
    source.includes(":") ||
    source.startsWith("\0")
  ) {
    return false;
  }
  // Everything else is a bare package specifier
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

export const writeCacheManifest = async (cached: Map<string, string>) => {
  const file = path.resolve("node_modules/xanix-cache/manifest.json");
  let manifest: any = {};

  for (const [key, value] of cached.entries()) {
    manifest[key] = value;
  }
  await fs.promises.writeFile(file, JSON.stringify(manifest, null, 2));
};

export const readCacheManifest = async () => {
  const file = path.resolve("node_modules/xanix-cache/manifest.json");
  if (!fs.existsSync(file)) {
    return new Map();
  }
  const content = await fs.promises.readFile(file, "utf-8");
  const parsed = JSON.parse(content);
  const map = new Map(Object.entries(parsed));
  return map;
};
