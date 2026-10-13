import fs from "node:fs";
import path from "node:path";
import type { Plugin } from "rolldown";
import { fileURLToPath } from "node:url";

const VIRTUAL_ID = "virtual:xanix-document";
const RESOLVED_ID = "\0virtual:xanix-document";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default function xanixDocument(): Plugin {
  const root = process.cwd();
  const userDocument = path.resolve(root, "document.tsx");
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

      return {
        code: `
import  * as _xdoc from ${JSON.stringify(documentFile)};
const mod = Object.assign({}, _xdoc);
if(!mod.default){
  throw new Error("The document module must have a default export.");
}
export default mod.default
export const metadata = mod.metadata ?? (() => ({}));
        `,
        map: null,
      };
    },
  };
}
