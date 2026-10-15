import { Plugin } from "rolldown";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const module = path.resolve(__dirname, "../modules/ReactRefresh.js");

const VIRTUAL_ID = "virtual:xanix-hrm";
const RESOLVED_ID = "\0virtual:xanix-hrm";

const ReactRefresh = ({ isDev }: { isDev: boolean }): Plugin => {
  return {
    name: "xanix:react-refresh",
    resolveId(id) {
      if (id === VIRTUAL_ID) {
        return RESOLVED_ID;
      }
      return null;
    },

    async load(id) {
      if (id === RESOLVED_ID) {
        if (!isDev) {
          return "";
        }
        return `import ${JSON.stringify(module)};`;
      }
      return null;
    },
  };
};

export default ReactRefresh;
