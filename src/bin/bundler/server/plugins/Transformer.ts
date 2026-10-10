import { type Plugin } from "rolldown";
import TransformUseServer from "./transformer/TransformUseServer.js";
import TransformServerFunction from "./transformer/TransformServerFunction.js";
import TransformCacheFunction from "./transformer/TransformCacheFunction.js";
import { createManifest, getManifest } from "../../../include/manifest.js";
import crypto from "node:crypto";
import importFinder from "../../../modifier/importFinder.js";
import expressFunctionReplace from "./transformer/TransformExpressFunction.js";
import pageReplacer from "./transformer/TransformPage.js";
import { XanixClientEntry } from "../../../types.js";
import { frameworkDir } from "../../../include/utils.js";
import TransformCreateSession from "./transformer/TransformCreateSession.js";

type Args = {
  onChangeManifest?: () => Promise<void>;
};

const XanixTransformer = ({ onChangeManifest }: Args = {}): Plugin => {
  const entries: Map<string, XanixClientEntry> = new Map();
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

      if (xanixImports.length || id.startsWith(frameworkDir)) {
        const uid = crypto
          .createHash("sha256")
          .update(id)
          .digest("hex")
          .slice(0, 12);
        code = TransformUseServer(code, xanixImports, id);
        code = TransformServerFunction(code, xanixImports, uid, id);
        code = TransformCacheFunction(code, xanixImports, uid, id);
        code = TransformCreateSession(code, xanixImports, uid, id);
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
