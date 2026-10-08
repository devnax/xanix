import { type Plugin } from "rolldown";
import crypto from "node:crypto";
import cacheFunctionReplacer from "./replacer/cacheFunctionReplacer.js";
import importFinder from "../../../modifier/importFinder.js";
import useServerReplacer from "./replacer/useServerReplacer.js";
import serverFunctionReplacer from "./replacer/serverFunctionReplacer.js";

const XanixTransformer = (): Plugin => {
  return {
    name: "xanix-transform",
    async transform(code, id) {
      const xanixImports = importFinder(code, "xanix");
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
        code,
        map: null,
      };
    },
  };
};

export default XanixTransformer;
