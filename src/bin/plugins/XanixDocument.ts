import fs from "node:fs";
import path from "node:path";
import type { Plugin } from "rolldown";
import { fileURLToPath } from "node:url";

const VIRTUAL_ID = "virtual:xanix-document";
const RESOLVED_ID = "\0virtual:xanix-document";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default function xanixDocument(): Plugin {
  const root = process.cwd();
  const userDocument = path.resolve(root, "Document.tsx");
  const baseDocument = path.resolve(
    __dirname,
    "../../components/BaseDocument.js",
  );

  return {
    name: "xanix-document",

    resolveId(id) {
      if (id === VIRTUAL_ID) {
        return RESOLVED_ID;
      }
      return null;
    },

    load(id) {
      if (id !== RESOLVED_ID) {
        return null;
      }

      const documentFile = fs.existsSync(userDocument)
        ? userDocument
        : baseDocument;
      const source = fs.readFileSync(documentFile, "utf8");

      const hasMetadata =
        /\bexport\s+(?:const|let|var|function)\s+metadata\b/.test(source) ||
        /\bexport\s*\{[^}]*\bmetadata\b[^}]*\}/.test(source);

      return {
        code: `
import Document, * as DocumentModule from ${JSON.stringify(documentFile)};
export default Document;
export const metadata = ${
          hasMetadata ? "DocumentModule.metadata" : "async () => ({})"
        };
        `,
        map: null,
      };
    },
  };
}
