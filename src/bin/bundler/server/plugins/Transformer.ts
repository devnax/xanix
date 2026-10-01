import { type Plugin } from "rolldown";
import { walk } from "oxc-walker";
import fs from "fs/promises";
import path from "path";
import TransformExpress from "./Transformer/TransformExpress.js";
import TransformPage, { Entry } from "./Transformer/TransformPage.js";
import outdirs from "../../../../outdirs.js";
import { createManifest } from "../../../include/manifest.js";

function getParserLanguage(id: string): "js" | "jsx" | "ts" | "tsx" {
  const cleanId = id.split("?")[0];
  if (cleanId.endsWith(".tsx")) return "tsx";
  if (cleanId.endsWith(".ts")) return "ts";
  if (cleanId.endsWith(".jsx")) return "jsx";

  return "js";
}

const XanixTransformer = (): Plugin => {
  const entries: Map<string, Entry> = new Map();
  return {
    name: "xanix-transform",

    async buildStart() {
      entries.clear();
    },

    watchChange() {
      entries.clear();
    },

    async transform(code, id) {
      if (id.includes("node_modules")) {
        return null;
      }

      const ext = path.extname(id);
      if (ext !== ".tsx" && ext !== ".jsx") {
        return null;
      }

      const lang = getParserLanguage(id);
      const ast = this.parse(code, { lang });
      const transformExpress = new TransformExpress();
      const transformPage = new TransformPage(this, id, entries);

      walk(ast, {
        enter(node) {
          transformExpress.transform(node);
          transformPage.transform(node);
        },
      });

      let replacements = [
        ...transformExpress.replacements,
        ...(await transformPage.replacements()),
      ];

      const sorted = replacements.sort((a, b) => b.start - a.start);
      for (const { start, end, value } of sorted) {
        code = code.slice(0, start) + value + code.slice(end);
      }

      return {
        code,
        map: null,
      };
    },

    async generateBundle() {
      const file = path.resolve(
        process.cwd(),
        outdirs.root,
        "client-manifest.json",
      );
      try {
        await fs.access(file);
      } catch {
        await createManifest(Array.from(entries.values()));
        return;
      }
      const prevEntries = await fs.readFile(file, "utf-8");
      const pids = JSON.parse(prevEntries).map((e: any) => e.resolved);
      const cids = Array.from(entries.values()).map((entry) => entry.resolved);
      if (JSON.stringify(cids) === JSON.stringify(pids)) {
        return;
      }
      await createManifest(Array.from(entries.values()));
    },
  };
};

export default XanixTransformer;
