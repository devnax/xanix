import type { Plugin } from "rollup";
import { XanixClientEntry } from "../../types.js";

export default function xanixHydrate(entries: XanixClientEntry[]): Plugin {
  const entryNames = new Set(entries.map((entry) => entry.name));

  return {
    name: "xanix-hydrate",

    renderChunk(code, chunk) {
      // Only process the entries we explicitly provided.
      if (!chunk.isEntry || !entryNames.has(chunk.name)) {
        return null;
      }

      // Must have a default export.
      if (!chunk.exports.includes("default")) {
        return null;
      }

      // Find Rollup's generated default export variable.
      const match = code.match(/export\s*\{\s*([^,\s]+)\s+as\s+default\s*\}/);

      if (!match) {
        return null;
      }

      const component = match[1];

      const hydration =
        `\nwindow.xanix.hydrate(` +
        `${component}, ` +
        `window.PAGE_PROPS` +
        `);\n`;

      const exportIndex = code.lastIndexOf("export {");

      if (exportIndex === -1) {
        return null;
      }

      return {
        code: code.slice(0, exportIndex) + hydration + code.slice(exportIndex),

        map: null,
      };
    },
  };
}
