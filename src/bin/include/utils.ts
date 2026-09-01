import fs from "node:fs";
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
  if (mode === "development") {
    return "xanix-runtime";
  }
  return uid("xanix-runtime", 32);
};

export const getDocumentFile = async () => {
  const documentEntry = path.join(process.cwd(), "Document.tsx");
  if (fs.existsSync(documentEntry)) {
    return documentEntry;
  }
  return path.join(__dirname, "../../../components/BaseDocument.js");
};

export const getDocumentFileName = (mode: "development" | "production") => {
  if (mode === "development") {
    return "xanix-documents";
  }
  return uid("xanix-document", 32);
};
