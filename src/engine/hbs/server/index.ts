import fs from "node:fs/promises";
import Handlebars from "handlebars";
import { metadataToHtml } from "../../../include/code/metadataToHtml.js";
import outdirs from "../../../include/outdirs.js";
import type { RenderContextServer } from "virtual:xanix-route";

export const render = async ({ route, req, res }: RenderContextServer) => {
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
  if (!html.includes("</html>")) {
    html = `<!DOCTYPE html><html><head></head><body>${html}</body></html>`;
  }

  html = html.replace("</head>", `${metahtml}</head>`);
  html = html.replace(
    "</body>",
    `
      <script>window.__XANIX_DATA__ = ${JSON.stringify({ props, path: route.path })}</script>
      <script type="module" src="/${outdirs.client}/runtime.js"></script>
    </body>`,
  );

  res.send(html);
};
