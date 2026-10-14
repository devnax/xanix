import type { FileRoute } from "../../libs/scanFileRoutes.js";
import { getAppRouteManifest } from "../routes.js";
import GenerateReactRoute from "./react.js";
const RouteGenerator = async () => {
  const routes = await getAppRouteManifest();
  const imports: string[] = [];
  const codes: string[] = [];

  for (let i = 0; i < routes.length; i++) {
    const route = routes[i];
    if (route.engine === "react") {
      const code = GenerateReactRoute(route, i);
      imports.push(...code.imports);
      codes.push(code.code);
    }
  }

  return {
    imports: imports.join("\n"),
    code: codes.join("\n"),
  };
};

export default RouteGenerator;
