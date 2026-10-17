import render from "./render.js";
import { metadataToHtml } from "../../../include/code/metadataToHtml.js";
import type { RenderContextServer } from "virtual:xanix-route";
import outdirs from "../../../include/outdirs.js";

const vueEngine = async ({ route, req, res }: RenderContextServer) => {
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
  const ctx: Record<string, any> = { req, res };
  const metahtml = metadataToHtml(metadata);
  const body = await render(app, ctx);
  const styles = [...((ctx.__styles as Map<string, string>) ?? [])]
    .map(([id, css]) => `<style id="${id}">${css}</style>`)
    .join("");

  const headExtra = metahtml + styles;

  let html = `<!DOCTYPE html>
<html>
  <head>
    ${headExtra}
  </head>
  <body>
    <div id="xanix-root">${body}</div>
    <script>window.__XANIX_DATA__ = ${JSON.stringify({ props: pageProps, path: route.path })}</script>
    <script type="module" src="/${outdirs.client}/runtime.js"></script>
  </body>
</html>`;
  res.send(html);
};

export default vueEngine;
