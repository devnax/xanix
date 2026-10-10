import { type Plugin } from "rolldown";
import crypto from "node:crypto";
import TransformCacheFunction from "./transformer/TransformCacheFunction.js";
import TransformCreateSession from "./transformer/TransformCreateSession.js";
import importFinder from "../../../modifier/importFinder.js";
import TransformUseServer from "./transformer/TransformUseServer.js";
import TransformServerFunction from "./transformer/TransformServerFunction.js";
import { uuid, frameworkDir } from "../../../include/utils.js";

const XanixTransformer = (): Plugin => {
  return {
    name: "xanix-transform",
    async transform(code, id) {
      const xanixImports = importFinder(code, "xanix");
      if (xanixImports.length || id.startsWith(frameworkDir)) {
        const uid = uuid(id);

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
