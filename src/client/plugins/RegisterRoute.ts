import path from "node:path";
import type { Plugin } from "rolldown";

import { fileURLToPath } from "node:url";
import { Engine } from "../../include/code/scanFileRoutes.js";
import {
  appRouteManifestFile,
  getAppRouteManifest,
} from "../../include/manifest/routesManifest.js";
import { normalizePath } from "../../include/utils.js";

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

const isModuleEngine = (engine: Engine) =>
  engine === "react" || engine === "vue" || engine === "svelte";

export default function RegisterRoute(): Plugin {
  return {
    name: "xanix:client:register-route",

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
        lines.push(
          `renderer: async () => Object.assign({}, (await import(${JSON.stringify(engine)})))`,
        );

        if (route.page) {
          const ppath = path.join(route.dir, route.page);
          if (isModuleEngine(route.engine)) {
            lines.push(`page: () => import(${JSON.stringify(ppath)})`);
          } else {
            this.addWatchFile(ppath);
            lines.push(`page: "${normalizePath(ppath)}"`);
          }

          if (route.layouts.length) {
            let layouts = [];
            for (let j = 0; j < route.layouts.length; j++) {
              const lpath = route.layouts[j];
              if (isModuleEngine(route.engine)) {
                layouts.push(`() => import(${JSON.stringify(lpath)})`);
              } else {
                layouts.push(`"${normalizePath(lpath)}"`);
              }
            }
            lines.push(`layouts: [${layouts.join(",\n")}]`);
          }
        }

        if (route.props) {
          this.addWatchFile(path.join(route.dir, route.props));
        }
        if (route.middleware) {
          this.addWatchFile(path.join(route.dir, route.middleware));
        }
        if (route.route) {
          this.addWatchFile(path.join(route.dir, route.route));
        }
        if (route.layout) {
          const layoutPath = path.join(route.dir, route.layout);
          this.addWatchFile(layoutPath);
        }

        codes.push(`
          {
            engine: "${route.engine}",
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
