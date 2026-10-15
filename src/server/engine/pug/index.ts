import { XanixRoute } from "../../../types";
import type { Request, Response } from "express";
import pug from "pug";
import { metadataToHtml } from "../../../include/code/metadataToHtml.js";

const renderPug = async (route: XanixRoute, req: Request, res: Response) => {
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

  let html = pug.renderFile(pagePath, { ...props });

  for (const layoutPath of [...layoutPaths].reverse()) {
    html = pug.renderFile(layoutPath, { ...props, children: html });
  }

  const metahtml = metadataToHtml(metadata);
  const hasHtml = html.includes("</html>");
  if (hasHtml) {
    html = html.replace("</head>", `${metahtml}</head>`);
    return { html, props };
  }

  html = `<!DOCTYPE html>
<html lang="en">
  <head>
    ${metahtml}
  </head>
  <body>
    ${html}
  </body>
</html>`;

  return {
    html,
    props,
  };
};

export default renderPug;
