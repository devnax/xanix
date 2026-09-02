import express from "express";
import dataLoader from "../../dataLoader.js";
import outdirs from "../../outdirs.js";

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
    `/${outdirs.root}/__data__/:xanixId`,
    express.json(),
    async (req, res) => {
      const { xanixId } = req.params;
      const args = req.body;
      const data = await dataLoader.result(xanixId, args);
      res.json({ data });
    },
  );

  app.use((req: any, res, next) => {
    let data: any = {
      title: null,
      meta: [],
    };

    if (!req.page) {
      req.page = {
        setTitle(title: string) {
          data.title = title;
        },
        setMeta(name: string, content: string) {
          data.meta.push({ name, content });
        },
      };

      req.XanixPageData = data;
    }

    next();
  });

  return app;
}

export default createXanixServer;
