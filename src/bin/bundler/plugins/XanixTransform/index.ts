import type { Plugin } from "rollup";
import { transformer } from "./transformer.js";
import path from "node:path";

export type XanixPluginOptions = {
  onChange?: (
    id: string,
    change?: { event: "update" | "delete" | "create" },
  ) => Promise<void>;
};

export function XanixTransform(option?: XanixPluginOptions): Plugin {
  return {
    name: "xanix-transform",
    async watchChange(id, change) {
      const file = path.resolve(id).replaceAll("\\", "/");
      await option?.onChange?.(file, change);
    },

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
