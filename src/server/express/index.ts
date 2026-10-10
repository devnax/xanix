import express, { Response, type Express } from "express";
import outdirs from "../../outdirs.js";
import React from "react";
import Router from "./Router.js";
import __xpage from "./page.js";

const xanixpress = () => {
  const app: Express = (express as any)("xanix");
  app.use("/__xanix__", express.json(), Router);
  const originalListener = app.listen.bind(app);

  app.use((req, res, next) => {
    const method = req.method.toUpperCase();
    if (method !== "GET") return next();

    const _send = res.send.bind(res);
    res.send = function (body?: any, pageId?: string): Response {
      const isElement = React.isValidElement(body) && pageId;
      const isContentType = req.headers["content-type"] === "application/xanix";
      const isPage =
        req.headers["x-xanix-page"] === __XANIX_PAGE_NAVIGATION_HEADER_VALUE__;
      const isNavigation = isPage && isContentType;

      if (isElement || isNavigation) {
        const info = {
          component: body,
          req,
          res,
          props: body?.props as any,
          pageId: pageId!,
        };
        __xpage(info, isNavigation).then(_send);
        return this;
      }
      return _send(body);
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
    server.on("error", (error: NodeJS.ErrnoException) => {
      throw error;
    });
    return server;
  };

  if (__XANIX_DEV__) {
    app.use(`/${outdirs.client}`, express.static(`${outdirs.client}`));
    app.use(`/assets`, express.static(outdirs.assets));
    app.use(`/__xmod`, express.static(`${outdirs.module_cache}`));
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

  return app;
};

export default xanixpress;
