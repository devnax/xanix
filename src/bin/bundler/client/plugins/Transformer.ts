import { type Plugin } from "rolldown";
import stripComments from "../../../libs/stripComments.js";
import TransformCacheFunction from "./transformer/TransformCacheFunction.js";
import TransformCreateSession from "./transformer/TransformCreateSession.js";
import importFinder from "../../../libs/findImport.js";
import TransformServerFunction from "./transformer/TransformServerFunction.js";
import { uuid, frameworkDir } from "../../../include/utils.js";

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
