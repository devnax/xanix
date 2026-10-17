import path from "node:path";
import type { Plugin } from "rolldown";
import { fileURLToPath } from "node:url";
import { Engine } from "../../../include/code/scanFileRoutes.js";
import {
  appRouteManifestFile,
  getAppRouteManifest,
} from "../../../include/manifest/routesManifest.js";
import { normalizePath } from "../../../include/utils.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const VIRTUAL_ID = "virtual:xanix-route";
const RESOLVED_ID = "\0virtual:xanix-route";

const resolveRenderar = (engine: string) =>
  path.resolve(__dirname, `../../../engine/${engine}/server/index.js`);

const renderars: Record<Engine, string> = {
  react: resolveRenderar("react"),
  vue: resolveRenderar("vue"),
  svelte: resolveRenderar("svelte"),
  hbs: resolveRenderar("hbs"),
  ejs: resolveRenderar("ejs"),
  pug: resolveRenderar("pug"),
  html: resolveRenderar("html"),
};

const isModuleEngine = (engine: Engine) =>
  engine === "react" || engine === "vue" || engine === "svelte";

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
        const renderar = renderars[route.engine];
        lines.push(
          `renderer: async () => Object.assign({}, (await import(${JSON.stringify(renderar)})))`,
        );

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

          if (route.props) {
            const propsPath = path.join(route.dir, route.props);
            lines.push(`props: () => import(${JSON.stringify(propsPath)})`);
          }

          if (isModuleEngine(route.engine)) {
            lines.push(`page: () => import(${JSON.stringify(ppath)})`);
          } else {
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

        codes.push(`
          {
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
