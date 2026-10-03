import fs from "node:fs";
import path from "node:path";
import type { Plugin } from "rolldown";
import { fileURLToPath } from "node:url";

const VIRTUAL_ID = "virtual:xanix-dev";
const RESOLVED_ID = "\0virtual:xanix-dev";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const filepath = path.resolve(path.resolve(__dirname, "../../../../dev.js"));

export default function VirtualDev(dev: boolean): Plugin {
  return {
    name: "xanix-dev",

    resolveId(id) {
      if (id === VIRTUAL_ID) {
        return RESOLVED_ID;
      }
      return null;
    },

    async load(id) {
      if (id !== RESOLVED_ID) {
        return null;
      }

      if (!dev) {
        return {
          code: "",
          map: null,
        };
      }

      const source = await fs.promises.readFile(filepath, "utf8");

      return {
        code: source,
        map: null,
      };
    },
  };
}
