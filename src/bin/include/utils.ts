import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";
import { readFile } from "fs/promises";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const frameworkDir = path.resolve(__dirname, "../../../");

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

export const getClientRuntimeFile = () => {
  return path.join(frameworkDir, "dist/client-runtime.js");
};

export const getClientRuntimeFileName = (
  mode: "development" | "production",
) => {
  let n = "xanix-runtime";
  return mode === "development" ? n : uuid(n, 16);
};

export function normalizePath(file: string) {
  return path.resolve(file).split(path.sep).join("/");
}
