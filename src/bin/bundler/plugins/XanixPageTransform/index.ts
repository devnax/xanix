import type { Plugin } from "rollup";
import { transformer } from "./transformer.js";

export default function XanixPageTransform(): Plugin {
  return {
    name: "xanix-page-transform",
    async transform(code, id) {
      if (id.includes("node_modules") || !/\.(tsx?|jsx?)$/.test(id)) {
        return null;
      }

      const result = transformer(code, id);
      if (!result) {
        return null;
      }

      return {
        code: result.code,
        map: result.map,
      };
    },
  };
}
