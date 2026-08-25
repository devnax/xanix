import type { Plugin } from "rollup";
import { entryFinder } from "./finder.js";
import { XanixClientEntry } from "../../../types.js";

export type XanixPluginOptions = {
  entries: Map<string, XanixClientEntry>;
};

export function XanixEntryFinder({ entries }: XanixPluginOptions): Plugin {
  return {
    name: "xanix-entry-finder",

    async transform(code, id) {
      if (id.includes("node_modules") || !/\.(tsx?|jsx?)$/.test(id)) {
        return null;
      }

      const clientEntries = entryFinder(code, id);
      if (!clientEntries) {
        return null;
      }

      for (const entry of clientEntries) {
        const resolved = await this.resolve(entry.file, id, {
          skipSelf: true,
        });

        if (!resolved) {
          this.error(
            `Could not resolve client component "${entry.file}" imported by "${id}"`,
          );
        }
        entries.set(entry.id, entry);
      }

      return null;
    },

    generateBundle() {
      const manifest = {
        version: 1,
        entries: [...entries.values()],
      };

      this.emitFile({
        type: "asset",
        fileName: "client-manifest.json",
        source: JSON.stringify(manifest, null, 2),
      });
    },
  };
}
