import { render } from "svelte/server";
import { metadataToHtml } from "../../../include/code/metadataToHtml.js";
import outdirs from "../../../include/outdirs.js";
import type { RenderContextServer } from "virtual:xanix-route";

const svelteEngine = async ({ route, req, res }: RenderContextServer) => {
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
  const metahtml = metadataToHtml(metadata);
  let html = `<!DOCTYPE html>
  <html>
  <head>
  ${metahtml}
  ${head}
    <script>
      window.$RefreshReg$ = (type, id) => {};
      window.$RefreshSig$ = () => (type) => type;
    </script>
  </head>
  <body>
    ${body}
    <script>window.__XANIX_DATA__ = ${JSON.stringify({ props: pageProps, path: route.path })}</script>
    <script type="module" src="/${outdirs.client}/runtime.js"></script>
  </body>
  </html>`;

  res.send(html);
};

export default svelteEngine;
