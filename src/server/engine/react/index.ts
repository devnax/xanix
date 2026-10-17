import render from "./render.js";
import formatMetadata from "./formatMetadata.js";
import type { RenderContextServer } from "virtual:xanix-route";
import outdirs from "../../../include/outdirs.js";

const reactEngine = async ({ route, req, res }: RenderContextServer) => {
  res.setHeader("path", route.path);
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
  const metadata = await formatMetadata(_page, _props, _layouts, req, res);
  const isJSON = req.headers["accept"] === "application/json";
  if (isJSON) {
    res.json({ props: pageProps, path: route.path, metadata: metadata.data });
    return;
  }

  const element = _layouts.reduceRight(
    (children, Layout) => createElement(Layout.default, { req, res }, children),
    createElement(_page.default, { req, res, ...pageProps }),
  );

  let html = await render(element);
  html = `<!DOCTYPE html><html><head></head><body></body></html>`;

  if (!html.includes("</html>")) {
  }

  html = html.replace(
    "</head>",
    `${metadata.html}
      <script>
      window.$RefreshReg$ = (type, id) => {};
      window.$RefreshSig$ = () => (type) => type;
      </script>
      <script>window.__XANIX_DATA__ = ${JSON.stringify({ props: pageProps, path: route.path })}</script>
      <script type="module" src="/${outdirs.client}/runtime.js"></script>
    </head>`,
  );

  res.setHeader("Content-Type", "text/html");
  res.send(html);
};

export default reactEngine;
