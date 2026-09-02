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

      return `
import Document from ${JSON.stringify(document)};

export default Document;
      `;
    },
  };
}
