import type { Plugin } from "rollup";
import { transformer } from "./transformer.js";

export type XanixPluginOptions = {
  mode: "watch" | "start";
};

export function XanixTransform(option: XanixPluginOptions): Plugin {
  return {
    name: "xanix-transform",
    async transform(code, id) {
      if (id.includes("node_modules") || !/\.(tsx?|jsx?)$/.test(id)) {
        return null;
      }

      const result = transformer(code, id, option.mode);
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
