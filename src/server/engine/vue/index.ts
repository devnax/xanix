import { Request, Response } from "express";
import { XanixRoute } from "../../../types/index.js";
import render from "./render.js";
import { metadataToHtml } from "../../../include/code/metadataToHtml.js";

const vueEngine = async (route: XanixRoute, req: Request, res: Response) => {
  const { createSSRApp, h } = await import("vue");

  const page = route.page as () => Promise<any>;
  const props = route.props || ((async () => ({})) as () => Promise<any>);
  const layouts = (route.layouts ?? []) as (() => Promise<any>)[];
  const promises = [page(), props(), ...layouts.map((load) => load())];

  const [_page, _props, ..._layouts] = await Promise.all(promises);
  const pageProps = {};
  const metadata = {};
  if (_props?.props) {
    Object.assign(pageProps, await _props.props(req, res));
  }

  if (typeof _props.metadata === "object") {
    Object.assign(metadata, _props.metadata);
  } else if (typeof _props.metadata === "function") {
    Object.assign(metadata, await _props.metadata(req, res));
  }

  // Layouts receive the inner content through their default slot.
  const buildTree = () =>
    _layouts.reduceRight(
      (children, Layout) =>
        h(Layout.default, null, { default: () => children }),
      h(_page.default, { ...pageProps }),
    );

  const app = createSSRApp({ render: buildTree });
  app.provide("req", req);
  app.provide("res", res);

  const metahtml = metadataToHtml(metadata);
  const body = await render(app, { req, res });
  const hasHtml = body.includes("</html>");
  if (hasHtml) {
    let html = body.replace("</head>", `${metahtml}</head>`);
    return { html, props: pageProps };
  }

  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    ${metahtml}
  </head>
  <body>
    <div id="xanix-root">${body}</div>
  </body>
</html>`;

  return { html, props: pageProps };
};

export default vueEngine;
