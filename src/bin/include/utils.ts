import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";

const __dirname = fileURLToPath(import.meta.url);

export function uid(value: string, length?: number) {
  const hash = crypto.createHash("sha256").update(value).digest("hex");
  return length ? hash.slice(0, length) : hash;
}

export const getClientRuntimeFile = () => {
  return path.join(__dirname, "../../../client-runtime.js");
};

export const getClientRuntimeFileName = (
  mode: "development" | "production",
) => {
  let n = "xanix-runtime";
  return mode === "development" ? n : uid(n, 16);
};
