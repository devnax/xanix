import { transformSync } from "@babel/core";
import { createRequire } from "node:module";
import type { Plugin } from "rollup";
const require = createRequire(import.meta.url);

export default function xanixReactRefresh(): Plugin {
  return {
    name: "xanix-react-refresh",

    transform(code, id) {
      if (id.includes("node_modules") || !/\.[jt]sx?$/.test(id)) {
        return null;
      }

      const result = transformSync(code, {
        filename: id,
        sourceMaps: true,

        plugins: [
          [
            require.resolve("@babel/plugin-transform-react-jsx"),
            {
              runtime: "automatic",
              development: true,
            },
          ],
          require.resolve("react-refresh/babel"),
        ],
      });

      if (!result?.code) {
        return null;
      }

      const refreshRuntime = `
import * as RefreshRuntime from "react-refresh";

const $RefreshReg$ = RefreshRuntime.register;
const $RefreshSig$ =
  RefreshRuntime.createSignatureFunctionForTransform;

`;

      return {
        code: refreshRuntime + result.code,
        map: result.map as any,
      };
    },
  };
}
