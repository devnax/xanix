import { transform } from "oxc-transform";
import type { Plugin } from "rollup";

function xanixTransform(): Plugin {
  return {
    name: "xanix-transform",

    async transform(code, id) {
      if (!id.endsWith(".tsx")) {
        return null;
      }

      const result = await transform(id, code, {
        lang: "tsx",
        sourcemap: true,
        jsx: {
          runtime: "automatic",
        },
      });

      return {
        code: result.code,
        map: result.map,
      };
    },
  };
}

export default xanixTransform;
