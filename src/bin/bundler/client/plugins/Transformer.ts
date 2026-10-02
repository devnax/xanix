import { type Plugin } from "rolldown";
import { walk } from "oxc-walker";
import fs from "fs/promises";
import path from "path";
import TransformServerAction from "./Transformer/TransformServerAction.js";
import TransformUseServer from "./Transformer/TransformUseServer.js";
import outdirs from "../../../../outdirs.js";
import { createManifest } from "../../../include/manifest.js";

function getParserLanguage(id: string): "js" | "jsx" | "ts" | "tsx" {
  const cleanId = id.split("?")[0];
  if (cleanId.endsWith(".tsx")) return "tsx";
  if (cleanId.endsWith(".ts")) return "ts";
  if (cleanId.endsWith(".jsx")) return "jsx";

  return "js";
}

const XanixTransformer = (): Plugin => {
  return {
    name: "xanix-transform",
    async transform(code, id) {
      if (id.includes("node_modules")) {
        return null;
      }

      const ext = path.extname(id);
      if (ext !== ".tsx" && ext !== ".jsx") {
        return null;
      }

      const lang = getParserLanguage(id);
      const ast = this.parse(code, { lang });
      const transformServerAction = new TransformServerAction(code, id);
      const transformUseServer = new TransformUseServer(code, id);
      walk(ast, {
        enter(node) {
          transformServerAction.transform(node);
          transformUseServer.transform(node);
        },
      });

      let replacements = [
        ...transformServerAction.replacements,
        ...transformUseServer.replacements,
      ];

      const sorted = replacements.sort((a, b) => b.start - a.start);
      for (const { start, end, value } of sorted) {
        code = code.slice(0, start) + value + code.slice(end);
      }
      const useServerCode = `
      ${!transformUseServer.serverImported ? 'import { server } from "xanix";' : ""}
      ${transformUseServer.serverCodes.join("\n")}
      `;
      return {
        code: useServerCode + "\n" + code,
        map: null,
      };
    },
  };
};

export default XanixTransformer;
