import type { Express } from "express";
import express from "express";

export interface XanixProps {
  clientId: string;
  req: any;
  res: any;
  component: React.ReactElement;
}

export default async function xanix_runtime(app: Express) {
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
}
