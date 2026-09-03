import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import type { Plugin } from "rollup";

const require = createRequire(import.meta.url);

const VIRTUAL_ID = "virtual:xanix-document";
const RESOLVED_ID = "\0virtual:xanix-document";

export default function xanixDocument(): Plugin {
  const root = process.cwd();

  const userDocument = path.resolve(root, "document.tsx");

  const baseDocument =
    require.resolve("../../../../../dist/components/BaseDocument.js");

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

      const document = fs.existsSync(userDocument)
        ? userDocument
        : baseDocument;

      const source = fs.readFileSync(document, "utf8");

      // Detect common metadata export forms.
      const hasMetadata =
        /\bexport\s+(?:const|let|var|function|class)\s+metadata\b/.test(
          source,
        ) || /\bexport\s*\{\s*[^}]*\bmetadata\b[^}]*\}/.test(source);

      if (hasMetadata) {
        return `
import Document, * as DocumentModule from ${JSON.stringify(document)};
export const metadata = DocumentModule.metadata;
export default Document;
`;
      }

      return `
import Document from ${JSON.stringify(document)};
export const metadata = async () => ({});
export default Document;
`;
    },
  };
}
