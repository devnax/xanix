import path from "node:path";
import { FileRoute } from "../../libs/scanFileRoutes.js";

const GenerateReactRoute = (route: FileRoute, index: number) => {
  const imports = [];
  const codes = [];
  if (route.middleware) {
    const middlewarePath = path.join(route.dir, route.middleware);
    imports.push(`import * as __middleware${index} from "${middlewarePath}"`);
  }
  if (route.route) {
    const routePath = path.join(route.dir, route.route);
    imports.push(`import * as __route${index} from "${routePath}"`);
  }

  codes.push(`const __route_mod${index} = Object.assign({}, __route${index});`);
  codes.push(`
      if (__route_mod${index}.router) {
        app.use("${route.path}", __route_mod${index}.router);
      }
    `);

  if (route.page) {
    codes.push(`
     app.get("${route.path}", (req, res) => {
     });
    `);
  }

  return { imports, code: codes.join("\n") };
};

export default GenerateReactRoute;
