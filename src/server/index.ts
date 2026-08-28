import express from "express";

export interface XanixProps {
  clientId: string;
  req: any;
  res: any;
  component: React.ReactElement;
}

type Options = {
  mode: "watch" | "start";
};

export function createXanixServer(options: Options): express.Express {
  const app = express();
  app.use("/.xanix/client", express.static(".xanix/client"));
  app.use("/.xanix/cache", express.static(".xanix/cache"));
  app.use(
    "/assets",
    express.static(".xanix/assets", {
      fallthrough: false,
      maxAge: "1y",
      immutable: true,
    }),
  );
  app.use((req: any, res, next) => {
    let data: any = {
      title: "",
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
