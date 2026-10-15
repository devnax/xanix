import { Plugin } from "rolldown";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateAppRouteManifest } from "../../../include/routes.js";
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
        const routes = await generateAppRouteManifest();
        let hasReact = false;
        for (let { engine } of routes) {
          if (engine === "react") {
            hasReact = true;
            break;
          }
        }
        return hasReact ? `import "${module}";` : "";
      }
      return null;
    },
  };
};

export default ReactRefresh;
