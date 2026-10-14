import fs from "node:fs";
import path from "node:path";
import type { Plugin } from "rolldown";
import { fileURLToPath } from "node:url";
import { getAppRouteManifest } from "../../../include/routes.js";
import RouteGenerator from "../../../include/RouteGenerator/index.js";

const VIRTUAL_ID = "virtual:xanix-route";
const RESOLVED_ID = "\0virtual:xanix-route";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default function RegisterRoute(): Plugin {
  const root = process.cwd();

  return {
    name: "xanix-document",

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

      const { imports, code } = await RouteGenerator();

      return {
        code: `
           ${imports}
           export default function registerRoute(app) {
             ${code}
           }
        `,
        map: null,
      };
    },
  };
}
