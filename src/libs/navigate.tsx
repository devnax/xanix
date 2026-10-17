import routes from "virtual:xanix-route";
import { render } from "../bundler/client/Route.js";

export const navigate = async (path: string) => {
  if (__XANIX_SERVER__) {
  } else {
    const route = routes.find((r: any) => r.path === path);
    if (!route) {
      window.location.href = path;
      return;
    }

    await render({ route, mode: "navigation" });
  }
};
