import express from "express";
import outdirs from "../../outdirs.js";
import {
  ServerRegistry,
  clearExpiredUseServerResources,
  getServerResource,
} from "../../hooks/useServer/core.js";

export interface XanixProps {
  clientId: string;
  req: any;
  res: any;
  component: React.ReactElement;
}

type Options = {
  mode: "watch" | "start";
};

function createXanixServer({ mode }: Options): express.Express {
  const app = express();
  const originalListener = app.listen;

  app.listen = (...args: any) => {
    const server = originalListener.apply(app, args);
    if (__XANIX_DEV__) {
      const address = server.address();
      if (typeof address === "object" && address) {
        const host =
          address.address === "::" || address.address === "0.0.0.0"
            ? "localhost"
            : address.address;
        const port = address.port;
        process.send?.({
          type: "xanix:server:info",
          host: `http://${host}:${port}`,
        });
      }
    }

    return server;
  };

  if (mode === "watch") {
    app.use(`/${outdirs.client}`, express.static(`${outdirs.client}`));
    app.use(`/assets`, express.static(outdirs.assets));
    app.use(`/${outdirs.cache}`, express.static(`${outdirs.cache}`));
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
}

export default createXanixServer;
