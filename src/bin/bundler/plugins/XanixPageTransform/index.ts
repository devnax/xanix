import type { Plugin } from "rollup";
import { transformer } from "./transformer.js";
import { parseSync } from "oxc-parser";
import { walk } from "oxc-walker";

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
      const hasXanixPage = /\b[A-Za-z_$][\w$]*\s*\.\s*send\s*\(\s*</.test(code);
      if (!/\.(tsx?|jsx?)$/.test(id) || !hasXanixPage) {
        return null;
      }

      // console.log(id);

      const ast = parseSync(id, code, {
        sourceType: "module",
      });

      walk(ast.program, {
        enter(node) {},
      });

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
