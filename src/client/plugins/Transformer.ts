import { type Plugin } from "rolldown";
import TransformCacheFunction from "./transformer/TransformCacheFunction.js";
import TransformCreateSession from "./transformer/TransformCreateSession.js";
import TransformServerFunction from "./transformer/TransformServerFunction.js";
import { frameworkDir, uuid } from "../../include/utils.js";
import importFinder from "../../include/code/findImport.js";
import stripComments from "../../include/code/stripComments.js";

const XanixTransformer = (): Plugin => {
  return {
    name: "xanix-transform",
    async transform(code, id) {
      if (!/\.[jt]sx?$/.test(id)) return null;
      const xanixImports = importFinder(code, "xanix");
      if (xanixImports.length || id.startsWith(frameworkDir)) {
        const uid = uuid(id, 12);
        code = stripComments(code);
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
