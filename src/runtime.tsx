import type { Express } from "express";
import express from "express";

export interface XanixProps {
  clientId: string;
  req: any;
  res: any;
  component: React.ReactElement;
}

export default async function xanix_runtime(app: Express) {
  app.use("/__client__", express.static(".xanix/client"));
}
