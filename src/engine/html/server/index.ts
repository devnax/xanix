import fs from "node:fs/promises";
import { metadataToHtml } from "../../../include/code/metadataToHtml.js";
import outdirs from "../../../include/outdirs.js";
import type { RenderContextServer } from "virtual:xanix-route";

const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const getPath = (obj: any, key: string) =>
  key.split(".").reduce((acc, k) => (acc == null ? undefined : acc[k]), obj);

// {{ key }}  -> escaped value from props
// {{{ key }}} -> raw value from props
// {{{ children }}} / {{ children }} -> rendered inner HTML (never escaped)
// Unknown keys render as an empty string.
const interpolate = (source: string, vars: Record<string, any>) =>
  source.replace(
    /\{\{\{\s*([\w.]+)\s*\}\}\}|\{\{\s*([\w.]+)\s*\}\}/g,
    (_match, rawKey, escKey) => {
      const key = rawKey ?? escKey;
      const value = getPath(vars, key);
      if (key === "children" || rawKey) return String(value ?? "");
      return escapeHtml(value);
    },
  );

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
  let html = interpolate(pageSource, props);

  for (const layoutPath of [...layoutPaths].reverse()) {
    const layoutSource = await fs.readFile(layoutPath, "utf8");
    html = interpolate(layoutSource, { ...props, children: html });
  }

  const metahtml = metadataToHtml(metadata);

  if (!html.includes("</html>")) {
    html = `<!DOCTYPE html><html><head></head><body>${html}</body></html>`;
  }

  html = html.replace("</head>", `${metahtml}</head>`);
  html = html.replace(
    "</head>",
    `
      <script>window.__XANIX_DATA__ = ${JSON.stringify({ props, path: route.path })}</script>
      <script type="module" src="/${outdirs.client}/runtime.js"></script>
    </head>`,
  );

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("path", route.path);
  res.send(html);
};
