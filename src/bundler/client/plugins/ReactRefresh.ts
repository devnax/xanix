import { Plugin } from "rolldown";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const module = path.resolve(__dirname, "../modules/ReactRefresh.js");

const VIRTUAL_ID = "virtual:react-refresh";
const RESOLVED_ID = "\0virtual:react-refresh";

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
        return `import RefreshRuntime from "react-refresh/runtime";
        
        RefreshRuntime.injectIntoGlobalHook(window);
        window.$RefreshReg$ = (type, id) => {
          RefreshRuntime.register(type, id);
        }
         
        window.$RefreshSig$ =
          RefreshRuntime.createSignatureFunctionForTransform;
        window.RefreshRuntime = RefreshRuntime;
        `;
      }
      return null;
    },
  };
};

export default ReactRefresh;
