import type { Express } from "express";
import express from "express";
import { XanixPageData } from "./types";

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
  app.use((req: any, res, next) => {
    let data: XanixPageData = {
      title: "",
      meta: new Map<string, string>(),
      styles: new Set<string>(),
      scripts: Array<{
        src: string;
        type?: string;
        placement: "head" | "body";
      }>(),
      headerHtml: "",
      footerHtml: "",
    };
    if (!req.page) {
      req.page = {
        setTitle(title: string) {
          data.title = title;
        },
        setMeta(name: string, content: string) {
          data.meta.set(name, content);
        },
        setStyle(href: string) {
          data.styles.add(href);
        },
        setScript(
          src: string,
          type?: string,
          placement: "head" | "body" = "body",
        ) {
          data.scripts.push({ src, type, placement });
        },
        setHeaderHtml(content: string) {
          data.headerHtml = content;
        },
        setFooterHtml(content: string) {
          data.footerHtml = content;
        },
      };

      req.xanixPageData = data;
    }

    next();
  });
}
