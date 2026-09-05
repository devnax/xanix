import type { Plugin } from "rollup";
import fs from "node:fs";
import { transformer } from "./transformer.js";
import path from "node:path";
import outdirs from "../../../../outdirs.js";

export default function XanixPageTransform(): Plugin {
  const entries = new Map();
  let pending = false;
  return {
    name: "xanix-page-transform",
    watchChange() {
      entries.clear();
    },
    buildStart() {
      entries.clear();
    },
    async transform(code, id) {
      if (id.includes("node_modules") || !/\.(tsx?|jsx?)$/.test(id)) {
        return null;
      }

      const result = transformer(code, id);
      if (!result) {
        return null;
      }

      for (const entry of result.entries) {
        entries.set(entry.id, entry);
      }
      if (result.entries.length) {
        pending = true;
      }

      return {
        code: result.code,
        map: result.map,
      };
    },
    async generateBundle() {
      if (pending) {
        const manifest = {
          id: `id_`,
          entries: [...entries.values()],
        };

        this.emitFile({
          type: "asset",
          fileName: "client-manifest.json",
          source: JSON.stringify(manifest, null, 2),
        });
        pending = false;
      }
    },
  };
}
