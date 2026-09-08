import type { Plugin } from "rolldown";
import { transformer, type XanixPageEntry } from "./transformer.js";

export default function XanixPageTransform(): Plugin {
  const entries = new Map<string, XanixPageEntry>();

  return {
    name: "xanix-page-transform",

    transform: {
      filter: {
        id: /^(?!.*(?:node_modules[\\/])).*\.[cm]?[jt]sx?$/,
      },

      handler(code, id) {
        const lang = getParserLanguage(id);

        const ast = this.parse(code, {
          lang,
        }) as any;

        const result = transformer(code, id, ast);

        if (!result) {
          return null;
        }

        for (const entry of result.entries) {
          entries.set(entry.id, entry);
        }

        return {
          code: result.code,
          map: null,
        };
      },
    },

    buildStart() {
      entries.clear();
    },

    watchChange() {
      entries.clear();
    },

    generateBundle() {
      if (!entries.size) {
        return;
      }

      const manifest = {
        id: "id_",
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

function getParserLanguage(id: string): "js" | "jsx" | "ts" | "tsx" {
  const cleanId = id.split("?")[0];

  if (cleanId.endsWith(".tsx")) {
    return "tsx";
  }

  if (cleanId.endsWith(".ts")) {
    return "ts";
  }

  if (cleanId.endsWith(".jsx")) {
    return "jsx";
  }

  return "js";
}
