import path from "node:path";
import type { Plugin } from "rolldown";
import {
  appRouteManifestFile,
  getAppRouteManifest,
} from "../../../include/routes.js";
import { frameworkDir, uuid } from "../../../include/utils.js";
import { fileURLToPath } from "node:url";
import { Engine } from "../../../libs/scanFileRoutes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const VIRTUAL_ID = "virtual:xanix-route";
const RESOLVED_ID = "\0virtual:xanix-route";

const engines: Record<Engine, string> = {
  react: path.resolve(__dirname, "../engine/react/index.js"),
  vue: path.resolve(__dirname, "../engine/vue/index.js"),
  svelte: path.resolve(__dirname, "../engine/svelte/index.js"),
  hbs: path.resolve(__dirname, "../engine/hbs/index.js"),
  ejs: path.resolve(__dirname, "../engine/ejs/index.js"),
  pug: path.resolve(__dirname, "../engine/pug/index.js"),
  html: path.resolve(__dirname, "../engine/html/index.js"),
};

export default function RegisterRoute(): Plugin {
  return {
    name: "xanix-register-route",

    resolveId(id) {
      if (id === VIRTUAL_ID) {
        return RESOLVED_ID;
      }
      return null;
    },

    async load(id) {
      if (id !== RESOLVED_ID) {
        return null;
      }

      this.addWatchFile(appRouteManifestFile);

      const routes = await getAppRouteManifest();
      const codes: string[] = [];
      const imports: string[] = [];

      for (let i = 0; i < routes.length; i++) {
        const route = routes[i];
        const lines: string[] = [];
        const engine = engines[route.engine];
        lines.push(`engine: () => import(${JSON.stringify(engine)})`);

        if (route.route) {
          const rpath = path.join(route.dir, route.route);
          imports.push(`import * as _rn${i} from ${JSON.stringify(rpath)}`);
          lines.push(`route: Object.assign({}, _rn${i})`);
        }
        if (route.middleware) {
          const mpath = path.join(route.dir, route.middleware);
          imports.push(`import * as _mn${i} from ${JSON.stringify(mpath)}`);
          lines.push(`middleware: Object.assign({}, _mn${i})`);
        }

        if (route.page) {
          const ppath = path.join(route.dir, route.page);
          this.addWatchFile(ppath);
          lines.push(`page: () => import(${JSON.stringify(ppath)})`);
        }

        if (route.layouts.length) {
          let layouts = [];
          for (let j = 0; j < route.layouts.length; j++) {
            const lpath = route.layouts[j];
            layouts.push(`() => import(${JSON.stringify(lpath)})`);
          }
          lines.push(`layouts: [${layouts.join(",\n")}]`);
        }

        codes.push(`
          {
            id: "${uuid(route.dir, 16)}",
            path: "${route.path}",
            ${lines.join(",\n")}
          },
        `);
      }

      return {
        code: `
           ${imports.join("\n")}
              const routes = [
               ${codes.join("\n")}
             ];
             export default routes;
        `,
        map: null,
      };
    },
  };
}
