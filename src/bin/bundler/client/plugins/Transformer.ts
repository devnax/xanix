import { type Plugin } from "rolldown";
import crypto from "node:crypto";
import TransformCacheFunction from "./transformer/TransformCacheFunction.js";
import TransformCreateSession from "./transformer/TransformCreateSession.js";
import importFinder from "../../../modifier/importFinder.js";
import TransformUseServer from "./transformer/TransformUseServer.js";
import TransformServerFunction from "./transformer/TransformServerFunction.js";
import { framworkDir } from "../../../include/path.js";

const XanixTransformer = (): Plugin => {
  return {
    name: "xanix-transform",
    async transform(code, id) {
      const xanixImports = importFinder(code, "xanix");
      if (xanixImports.length || id.startsWith(framworkDir)) {
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
        code,
        map: null,
      };
    },
  };
};

export default XanixTransformer;
