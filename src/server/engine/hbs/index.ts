import { XanixRoute } from "../../../types";
import type { Request, Response } from "express";
import fs from "node:fs/promises";
import Handlebars from "handlebars";
import { metadataToHtml } from "../../../include/code/metadataToHtml.js";

const renderHbs = async (route: XanixRoute, req: Request, res: Response) => {
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
  const pageTemplate = Handlebars.compile(pageSource);
  let html = pageTemplate(props);
  for (const layoutPath of [...layoutPaths].reverse()) {
    const layoutSource = await fs.readFile(layoutPath, "utf8");
    const layoutTemplate = Handlebars.compile(layoutSource);

    html = layoutTemplate({
      ...props,
      children: new Handlebars.SafeString(html),
    });
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
    props: props,
  };
};

export default renderHbs;
