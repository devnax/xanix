import { XanixRoute } from "../../../types";
import type { Request, Response } from "express";
import fs from "node:fs/promises";
import ejs from "ejs";
import { metadataToHtml } from "../../../include/code/metadataToHtml.js";

const renderEjs = async (route: XanixRoute, req: Request, res: Response) => {
  const pagePath = route.page as string;
  const layoutPaths: string[] = (route.layouts ?? []) as any;
  const propsModule: any = route.props ? await route.props() : {};

  const metadata = {};
  const props = {};

  if (propsModule.props) {
    Object.assign(props, (await propsModule.props(req, res)) || {});
  }

  if (typeof propsModule.metadata === "object") {
    Object.assign(metadata, propsModule.metadata);
  } else if (typeof propsModule.metadata === "function") {
    Object.assign(metadata, await propsModule.metadata(req, res));
  }

  const pageSource = await fs.readFile(pagePath, "utf8");
  let html = await ejs.render(
    pageSource,
    { ...props },
    { filename: pagePath, async: true },
  );

  for (const layoutPath of [...layoutPaths].reverse()) {
    const layoutSource = await fs.readFile(layoutPath, "utf8");

    html = await ejs.render(
      layoutSource,
      { ...props, children: html },
      { filename: layoutPath, async: true },
    );
  }

  const metahtml = metadataToHtml(metadata);
  html = html.replace(
    "<head>",
    `<head>
      ${metahtml}
    `,
  );

  return {
    html: html,
    props,
  };
};

export default renderEjs;
