import { type Plugin } from "rolldown";
import useServerReplacer from "./replacer/useServerReplacer.js";
import serverFunctionReplacer from "./replacer/serverFunctionReplacer.js";
import cacheFunctionReplacer from "./replacer/cacheFunctionReplacer.js";
import { walk } from "oxc-walker";
import path from "path";
import TransformPage, { Entry } from "./Transformer/TransformPage.js";
import { createManifest, getManifest } from "../../../include/manifest.js";
import crypto from "node:crypto";
import importFinder from "../../../modifier/importFinder.js";
import expressFunctionReplace from "./replacer/expressFunctionReplace.js";
import pageReplacer from "./replacer/pageReplacer.js";

function getParserLanguage(id: string): "js" | "jsx" | "ts" | "tsx" {
  const cleanId = id.split("?")[0];
  if (cleanId.endsWith(".tsx")) return "tsx";
  if (cleanId.endsWith(".ts")) return "ts";
  if (cleanId.endsWith(".jsx")) return "jsx";

  return "js";
}

type Args = {
  onChangeManifest?: () => Promise<void>;
};
const XanixTransformer = ({ onChangeManifest }: Args = {}): Plugin => {
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
      const xanixImports = importFinder(code, "xanix");
      const expressImports = importFinder(code, "express");
      code = expressFunctionReplace(code, expressImports);
      code = await pageReplacer(id, code, this, entries);

      if (xanixImports.length) {
        const uid = crypto
          .createHash("sha256")
          .update(id)
          .digest("hex")
          .slice(0, 12);
        code = useServerReplacer(code, xanixImports);
        code = serverFunctionReplacer(code, xanixImports, uid);
        code = cacheFunctionReplacer(code, xanixImports, uid);
      }

      return {
        code: code,
        map: null,
      };
    },

    async generateBundle() {
      const prevEntries = await getManifest();
      const pids = prevEntries.map((e: any) => e.resolved);
      const cids = Array.from(entries.values()).map((entry) => entry.resolved);
      if (JSON.stringify(cids) === JSON.stringify(pids)) {
        return;
      }
      await createManifest(Array.from(entries.values()));
      await onChangeManifest?.();
    },
  };
};

export default XanixTransformer;
