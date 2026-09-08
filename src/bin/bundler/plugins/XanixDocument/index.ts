import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

import type { Plugin } from "rolldown";

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

      const documentFile = fs.existsSync(userDocument)
        ? userDocument
        : baseDocument;

      const source = fs.readFileSync(documentFile, "utf8");

      const hasMetadata =
        /\bexport\s+(?:const|let|var|function|class)\s+metadata\b/.test(
          source,
        ) || /\bexport\s*\{[^}]*\bmetadata\b[^}]*\}/.test(source);

      const importPath = path.resolve(documentFile).replaceAll("\\", "/");

      if (hasMetadata) {
        return {
          code: `
import Document, * as DocumentModule from ${JSON.stringify(importPath)};

export const metadata = DocumentModule.metadata;

export default Document;
`,
          map: null,
        };
      }

      return {
        code: `
import Document from ${JSON.stringify(importPath)};

export const metadata = async () => ({});

export default Document;
`,
        map: null,
      };
    },
  };
}
