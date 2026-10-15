import { Request, Response } from "express";
import { render } from "svelte/server";
import { XanixRoute } from "../../../types/index.js";
import { metadataToHtml } from "../../../include/code/metadataToHtml.js";

const svelteEngine = async (route: XanixRoute, req: Request, res: Response) => {
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

  // Layouts nest through props instead of snippets, so the same chain can be rebuilt
  // on the client for hydration. Each layout renders: <Child {...childProps} />
  const reqInfo = { path: req.path, url: req.originalUrl, query: req.query };

  let Root = _page.default;
  let rootProps: Record<string, any> = { ...pageProps, req: reqInfo };
  for (const Layout of [..._layouts].reverse()) {
    rootProps = { Child: Root, childProps: rootProps, req: reqInfo };
    Root = Layout.default;
  }

  let rendered = await render(Root, { props: rootProps });
  const { head, body } = rendered;
  const hasHtml = body.includes("</html>");
  if (hasHtml) {
    let html = body.replace("</head>", `${metadataToHtml(metadata)}</head>`);
    return { html, props: pageProps };
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  ${metadataToHtml(metadata)}
  ${head}
</head>
<body>${body}</body>
</html>`;

  return { html, props: pageProps };
};

export default svelteEngine;
