import type { Plugin } from "rolldown";
import { getManifest } from "../../include/manifest/manifest.js";

const VIRTUAL_ID = "virtual:xanix-pages";
const RESOLVED_ID = "\0virtual:xanix-pages";

export default function XanixAppRoot(): Plugin {
  return {
    name: "xanix-pages",

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

      const clients = await getManifest();
      const pages: string[] = [];

      for (const client of clients) {
        pages.push(`
          pages[${JSON.stringify(client.id)}] = () =>
            import(${JSON.stringify(client.resolved)});
        `);
      }

      return {
        code: `
          import React from "react";
          const pages = {};
          ${pages.join("\n")}
          export default pages;
        `,
        map: null,
        moduleType: "js",
      };
    },
  };
}
