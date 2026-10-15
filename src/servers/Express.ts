import xpress from "express";
import routes from "virtual:xanix-route";

const express = () => {
  const app = xpress();

  const originalListener = app.listen;
  app.listen = (...args: any) => {
    const server = originalListener.apply(app, args);
    const address = server.address();
    if (typeof address === "object" && address) {
      const host =
        address.address === "::" || address.address === "0.0.0.0"
          ? "localhost"
          : address.address;
      const port = address.port;
      process.send?.({
        type: "xanix:ready",
        port,
        url: `http://${host}:${port}`,
      });
    }
    server.on("error", (error: NodeJS.ErrnoException) => {
      throw error;
    });
    return server;
  };

  for (let _route of routes) {
    const { engine, path, page, route, middleware } = _route;

    if (route?.ROUTER) app.use(path, route.ROUTER);
    if (route?.GET) app.get(path, route.GET);
    if (route?.POST) app.post(path, route.POST);
    if (route?.PUT) app.put(path, route.PUT);
    if (route?.DELETE) app.delete(path, route.DELETE);
    if (route?.PATCH) app.patch(path, route.PATCH);
    if (route?.OPTIONS) app.options(path, route.OPTIONS);
    if (route?.HEAD) app.head(path, route.HEAD);

    if (middleware?.default) {
      app.use(path, async (req, res, next) => {
        // ignore devTools requests
        if (req.path.startsWith("/.well-known/")) {
          return next();
        }
        return await middleware.default(req, res, next);
      });
    }

    if (page) {
      app.get(path, async (req, res) => {
        const render = (await engine()).default;
        const html = await render(_route, req, res);
        res.send(html);
      });
    }
  }

  return app;
};

export default express;
