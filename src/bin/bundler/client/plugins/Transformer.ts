import { type Plugin } from "rolldown";
import { walk } from "oxc-walker";
import path from "path";
import TransformServerAction from "./Transformer/TransformServerAction.js";
import TransformUseServer from "./Transformer/TransformUseServer.js";
import TransformCache from "./Transformer/TransformCache.js";
import crypto from "node:crypto";

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
      const uid = crypto
        .createHash("sha256")
        .update(id)
        .digest("hex")
        .slice(0, 12);
      const lang = getParserLanguage(id);
      const ast = this.parse(code, { lang });
      const transformServerAction = new TransformServerAction(code, id, uid);
      const transformUseServer = new TransformUseServer(code, id, uid);
      const transformCache = new TransformCache(code, id, uid);
      // const transformModuleCache = new TransformModuleCache();

      walk(ast, {
        enter(node) {
          transformServerAction.transform(node);
          transformUseServer.transform(node);
          transformCache.transform(node);
          // transformModuleCache.transform(node);
        },
      });

      let replacements = [
        ...transformUseServer.replacements,
        // ...transformModuleCache.getReplacements(),
      ];

      if (transformServerAction.serverImported) {
        replacements = [...replacements, ...transformServerAction.replacements];
      }

      if (transformCache.cacheImported) {
        replacements = [...replacements, ...transformCache.replacements];
      }

      const sorted = replacements.sort((a, b) => b.start - a.start);
      for (const { start, end, value } of sorted) {
        code = code.slice(0, start) + value + code.slice(end);
      }
      let needImport = !transformUseServer.serverImported;

      const useServerCode = `
      ${needImport ? 'import * as __xanix from "xanix";' : ""}
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
