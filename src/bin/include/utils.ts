import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(import.meta.url);

export const getClientRuntimeFile = () => {
  return path.join(__dirname, "../../../client-runtime.js");
};

export const getDocumentFile = async () => {
  const documentEntry = path.join(process.cwd(), "Document.tsx");
  if (fs.existsSync(documentEntry)) {
    return documentEntry;
  }
  return path.join(__dirname, "../../../components/BaseDocument.js");
};
