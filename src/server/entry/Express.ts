import express from "express";
import routes from "virtual:xanix-route";
import outdirs from "../../include/outdirs.js";
import { encode } from "../../libs/encoder.js";
// import { XanixAssets } from "../../libs/xanix/index.js";

const xpress = () => {
  const app = express();
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

  if (__XANIX_DEV__) {
    app.use(`/${outdirs.client}`, express.static(`${outdirs.client}`));
    // app.use(`/assets/:file`, (req, res, next) => {
    //   const file = req.params.file.split("?")[0];
    //   const asset = XanixAssets.get(file);
    //   if (!asset) {
    //     res.status(404).send("404 Not Found");
    //     return;
    //   }
    //   res.sendFile(asset.path);
    // });
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
    // app.use("/assets/:file", (req, res) => {
    //   const asset = XanixAssets.get(req.params.file);
    //   if (!asset) {
    //     res.status(404).send("404 Not Found");
    //     return;
    //   }

    //   res.sendFile(asset.path, {
    //     maxAge: "1y",
    //     immutable: true,
    //     etag: true,
    //     lastModified: true,
    //   });
    // });
  }

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
      app.use(path, middleware.default);
    }

    if (page) {
      app.get(path, async (req, res) => {
        const render = (await engine()).default;
        let { html, props } = await render(_route, req, res);
        const data = {
          props,
          path,
        };

        const hasBody = html.includes("</body>");
        const hasHead = html.includes("</head>");

        let headScripts = [];
        headScripts.push(
          `<script>
          window.$RefreshReg$ = (type, id) => {};
          window.$RefreshSig$ = () => (type) => type;
          </script>`,
        );
        let bodyScripts = [];
        bodyScripts.push(
          `<script>window.__XANIX_DATA__ = ${JSON.stringify(data)}</script>`,
        );
        bodyScripts.push(
          `<script type="module" src="/${outdirs.client}/runtime.js"></script>`,
        );

        if (hasHead) {
          html = html.replace(
            "</head>",
            `${headScripts.join("\n")}
          </head>`,
          );
        } else {
          html = headScripts.join("\n") + html;
        }

        if (hasBody) {
          html = html.replace(
            "</body>",
            `${bodyScripts.join("\n")}
          </body>`,
          );
        } else {
          html += bodyScripts.join("\n");
        }

        res.send(html);
      });
    }
  }

  return app;
};

export default xpress;
