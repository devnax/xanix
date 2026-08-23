import type { Plugin } from "rollup";
import { transformXanix, type XanixClientEntry } from "./transform.js";
import path from "node:path";

export type XanixPluginOptions = {
  entries: Map<string, XanixClientEntry>;
  onChange?: (entry: XanixClientEntry) => void;
};

export function xanix({ entries }: XanixPluginOptions): Plugin {
  return {
    name: "xanix",

    watchChange(id, change) {
      const file = path.resolve(id);
    },

    async transform(code, id) {
      if (id.includes("node_modules") || !/\.(tsx?|jsx?)$/.test(id)) {
        return null;
      }

      const result = transformXanix(code, id);
      if (!result) {
        return null;
      }

      for (const entry of result.clientEntries) {
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

      return {
        code: result.code,
        map: result.map,
      };
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
