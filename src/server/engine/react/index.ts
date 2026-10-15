import { Request, Response } from "express";
import render from "./render.js";
import formatMetadata from "./formatMetadata.js";
import { XanixRoute } from "../../../types/index.js";

const reactEngine = async (route: XanixRoute, req: Request, res: Response) => {
  const { createElement } = await import("react");

  const page = route.page as () => Promise<any>;
  const props = route.props || ((async () => ({})) as () => Promise<any>);
  const layouts = (route.layouts ?? []) as (() => Promise<any>)[];
  const promises = [page(), props(), ...layouts.map((load) => load())];

  const [_page, _props, ..._layouts] = await Promise.all(promises);

  const pageProps = {};
  if (_props?.props) {
    Object.assign(pageProps, await _props.props(req, res));
  }

  if (_page.props) {
    Object.assign(pageProps, await _page.props(req, res));
  }

  const element = _layouts.reduceRight(
    (children, Layout) => createElement(Layout.default, { req, res }, children),
    createElement(_page.default, { req, res, ...pageProps }),
  );

  const metadata = await formatMetadata(_page, _props, _layouts, req, res);
  let html = await render(element);

  const hasHtml = html.includes("</html>");
  if (hasHtml) {
    html = html.replace("</head>", `${metadata.html}</head>`);
    return { html, props: pageProps };
  }

  html = `<!DOCTYPE html>
<html lang="en">
  <head>
    ${metadata.html}
  </head>
  <body>
    <div id="xanix-root">${html}</div>
  </body>
</html>`;
  return { html, props: pageProps };
};

export default reactEngine;
