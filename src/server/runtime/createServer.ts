import express from "express";
import outdirs from "../../outdirs.js";
import registry from "../../hooks/useServer/registry.js";

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
    `/${outdirs.root}/__server_data__/:uid`,
    express.json(),
    async (req, res) => {
      const { uid } = req.params;
      const args = req.body;
      const callback = registry.get(uid);
      if (callback) {
        const data = await callback(args);
        res.json({ data });
      } else {
        res.status(404).json({ error: "Invalid id" });
      }
    },
  );

  return app;
}

export default createXanixServer;
