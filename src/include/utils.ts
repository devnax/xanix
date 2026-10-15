import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";
import { readFile } from "fs/promises";
import fs from "node:fs/promises";
import outdirs from "./outdirs.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const frameworkDir = path.resolve(__dirname, "../../");

export const getFrameworkPackageJson = async () => {
  const packageJsonPath = path.join(frameworkDir, "package.json");
  const content = await readFile(packageJsonPath, "utf8");
  const packageJson = JSON.parse(content);
  return packageJson;
};

export function uuid(value: string, length?: number) {
  const hash = crypto.createHash("sha256").update(value).digest("hex");
  return length ? hash.slice(0, length) : hash;
}

export function normalizePath(file: string) {
  return path.resolve(file).split(path.sep).join("/");
}

export const ensureOutdir = async () => {
  await fs.rm(outdirs.root, {
    recursive: true,
    force: true,
  });

  await fs.mkdir(outdirs.root, {
    recursive: true,
  });
};
