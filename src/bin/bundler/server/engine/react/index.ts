import { Request, Response } from "express";
import render from "./render.js";
import formatMetadata from "./formatMetadata.js";
import { XanixRoute } from "../../../../types/index.js";

const reactEngine = async (route: XanixRoute, req: Request, res: Response) => {
  const { createElement } = await import("react");

  const page = route.page as () => Promise<any>;
  const layouts = route.layouts ?? [];
  const promises = [page(), ...layouts.map((load) => load())];

  const [_page, ..._layouts] = await Promise.all(promises);

  const element = _layouts.reduceRight(
    (children, Layout) => createElement(Layout.default, { req, res }, children),
    createElement(_page.default, { req, res }),
  );

  const metadata = formatMetadata(_page, _layouts, req, res);

  let html = await render(element);
  html = html.replace(
    "<head>",
    `<head>
      ${metadata.html}
    `,
  );
  return html;
};

export default reactEngine;
