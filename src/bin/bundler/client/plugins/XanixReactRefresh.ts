import type { Plugin } from "rolldown";
import path from "node:path";
import fs from "node:fs";
import { getClientRuntimeFile } from "../../../include/utils.js";

export default function xanixReactRefresh(): Plugin {
  return {
    name: "xanix-react-refresh",

    load(id) {
      if (path.resolve(id) !== getClientRuntimeFile()) {
        return null;
      }

      const code = fs.readFileSync(id, "utf8");

      const refreshCode = `

${code}
`;
      return {
        code: refreshCode,
        map: null,
      };
    },
  };
}
