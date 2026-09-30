import express, { Router, Response } from "express";
import outdirs from "../outdirs.js";
import {
  clearExpiredUseServerResources,
  getServerResource,
} from "../hooks/useServer/core.js";
import Page from "./page.js";

export { Router };

const __xpress = (...args: Parameters<typeof express>) => {
  const isDev = __XANIX_DEV__;
  const app = express(...args);
  const originalListener = app.listen;

  app.use((req, res, next) => {
    const originalSend = res.send;
    res.send = function (body?: any): Response {
      body = Page(body);
      return originalSend.call(this, body);
    };
    next();
  });

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

    return server;
  };

  if (isDev) {
    app.use(`/${outdirs.client}`, express.static(`${outdirs.client}`));
    app.use(`/assets`, express.static(outdirs.assets));
    app.use(`/${outdirs.cache}`, express.static(`${outdirs.cache}`));
    app.use(
      `/node_modules/xanix-cache/`,
      express.static(`node_modules/xanix-cache`),
    );
    app.use(`/xanix-cache/`, express.static(`node_modules/xanix-cache`));
  } else {
    app.use(
      `/${outdirs.client}`,
      express.static(`${outdirs.client}`, {
        maxAge: "1y",
        immutable: true,
        etag: true,
      }),
    );
    app.use(
      `/assets`,
      express.static(outdirs.assets, {
        maxAge: "1y",
        immutable: true,
        etag: true,
      }),
    );
  }

  app.post(
    `/${outdirs.root}/__server_data__/:pageId/:uid`,
    express.json(),
    async (req, res) => {
      const { pageId, uid } = req.params;
      const args = req.body;

      clearExpiredUseServerResources();

      try {
        const resource = getServerResource(pageId, uid, args);
        const data = await resource.promise;
        res.json({
          data,
        });
      } catch (error) {
        console.error(error);
        res.status(500).json({
          error: "Failed to execute useServer",
        });
      }
    },
  );
  return app;
};

export default __xpress;
