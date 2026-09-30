import { rolldown, type Plugin } from "rolldown";
import { walk } from "oxc-walker";
import TransformExpress from "./TransformExpress.js";
import TransformPage from "./TransformPage.js";
import loadEnv from "../../config/loadEnv.js";
import {
  getClientRuntimeFile,
  getClientRuntimeFileName,
} from "../../../include/utils.js";
import { xanixDefaultPlugins } from "../plugins.js";
import bundlerOutput from "../../config/output.js";

function getParserLanguage(id: string): "js" | "jsx" | "ts" | "tsx" {
  const cleanId = id.split("?")[0];

  if (cleanId.endsWith(".tsx")) return "tsx";
  if (cleanId.endsWith(".ts")) return "ts";
  if (cleanId.endsWith(".jsx")) return "jsx";

  return "js";
}

const XanixTransform = (): Plugin => {
  let entries: any = [];
  return {
    name: "xanix-transform",

    async transform(code, id) {
      if (id.includes("node_modules")) {
        return null;
      }

      const lang = getParserLanguage(id);
      if (lang !== "tsx" && lang !== "jsx") {
        return null;
      }

      const ast = this.parse(code, { lang });
      const transformExpress = new TransformExpress();
      const transformPage = new TransformPage();

      walk(ast, {
        enter(node) {
          transformExpress.transform(node);
          transformPage.transform(node);
        },
      });

      let replacements = [
        ...transformExpress.replacements,
        ...transformPage.replacements,
      ];

      for (let entry of transformPage.entries) {
        const resolved = await this.resolve(entry.source, id, {
          skipSelf: true,
        });
        entry.resolved = resolved?.id ?? "";
        entries.push(entry);
      }

      const sorted = replacements.sort((a, b) => b.start - a.start);
      for (const { start, end, value } of sorted) {
        code = code.slice(0, start) + value + code.slice(end);
      }

      return {
        code,
        map: null,
      };
    },

    async generateBundle() {
      const input: any = {};

      for (let entry of entries) {
        input[entry.name] = entry.resolved;
      }
      const runtimeFileName = getClientRuntimeFileName("development");
      input[runtimeFileName] = getClientRuntimeFile();
      const build = await rolldown({
        input,
        treeshake: true,
        tsconfig: true,
        checks: {
          moduleLevelDirective: false,
        },
        resolve: {
          extensions: [".mjs", ".js", ".jsx", ".json", ".ts", ".tsx"],
          conditionNames: ["browser", "import", "module", "default"],
        },
        transform: {
          target: "es2022",
          jsx: {
            runtime: "automatic",
            // refresh: true,
          },
          define: await loadEnv({
            mode: "development",
            isClient: true,
          }),
        },
        plugins: [
          ...xanixDefaultPlugins({
            WebSocketPort: 3000,
            target: "client",
            development: true,
            assetExternal: true,
          }),
        ],
      });

      await build.write(bundlerOutput.client(entries, { isDev: true }));
      await build.close();
    },
  };
};

export default XanixTransform;
