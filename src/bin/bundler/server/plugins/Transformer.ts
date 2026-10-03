import { type Plugin } from "rolldown";
import { walk } from "oxc-walker";
import fs from "fs/promises";
import path from "path";
import TransformServer from "./Transformer/TransformServer.js";
import TransformPage, { Entry } from "./Transformer/TransformPage.js";
import TransformServerAction from "./Transformer/TransformServerAction.js";
import TransformUseServer from "./Transformer/TransformUseServer.js";
import outdirs from "../../../../outdirs.js";
import { createManifest } from "../../../include/manifest.js";
import TransformCache from "./Transformer/TransformCache.js";

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
      const transformServer = new TransformServer();
      const transformPage = new TransformPage(this, id, entries);
      const transformServerAction = new TransformServerAction(code, id);
      const transformUseServer = new TransformUseServer(code, id);
      const transformCache = new TransformCache(code, id);
      walk(ast, {
        enter(node) {
          transformServer.transform(node);
          transformPage.transform(node);
          transformServerAction.transform(node);
          transformUseServer.transform(node);
          transformCache.transform(node);
        },
      });

      let replacements = [
        ...transformServer.replacements,
        ...transformUseServer.replacements,
        ...(await transformPage.replacements()),
      ];

      if (transformServerAction.serverImported) {
        replacements = [...replacements, ...transformServerAction.replacements];
      }
      if (transformCache.cacheImported) {
        replacements = [...replacements, ...transformCache.replacements];
      }

      const sorted = replacements.sort((a, b) => b.start - a.start);
      for (const { start, end, value } of sorted) {
        code = code.slice(0, start) + value + code.slice(end);
      }

      const useServerCode = `
      ${!transformUseServer.serverImported ? 'import * as __xanix from "xanix";' : ""}
      ${transformUseServer.serverCodes.join("\n")}
      `;

      if (transformServer.foundServer) {
        code = `import {xanix} from "xanix";\n` + code;
      }

      return {
        code: useServerCode + "\n" + code,
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
