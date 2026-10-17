import "virtual:react-refresh";
import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { RenderContext, XanixRoute } from "virtual:xanix-route";
import { exit } from "../../../bundler/client/Route.js";

let _root: Root | null = null;
const getRoot = (): Root => (_root = _root ?? createRoot(document));

const getProps = async (route: XanixRoute) => {
  const htmlRes = await fetch(route.path);
  const html = await htmlRes.text();
  const doc = new DOMParser().parseFromString(html, "text/html");
  const script = doc.getElementById("__XANIX_DATA__");

  if (script) {
    window.__XANIX_DATA__ = eval(script.textContent || "");
  }
  document.documentElement.innerHTML = html;
};

const renderClient = async (route: XanixRoute, props: Record<string, any>) => {
  const page = route.page as () => Promise<any>;
  const layouts = (route.layouts ?? []) as (() => Promise<any>)[];
  const [_page, ..._layouts] = await Promise.all([
    page(),
    ...layouts.map((load) => load()),
  ]);

  return _layouts.reduceRight(
    (children, Layout) => createElement(Layout.default, {}, children),
    createElement(_page.default, { ...props }),
  );
};

export const onExit = () => {
  _root?.unmount();
  _root = null;
};

export const render = async ({ route, mode }: RenderContext) => {
  try {
    if (mode === "navigation") {
      await getProps(route);
      const data = window.__XANIX_DATA__ ?? { props: {} };
      const element = await renderClient(route, data.props);

      if (location.pathname + location.search !== data.path) {
        history.pushState(null, "", data.path);
      }
      await exit();

      const root = getRoot();
      root.render(element);
    } else {
      const data = window.__XANIX_DATA__ ?? { props: {} };
      const element = await renderClient(route, data.props);
      const root = getRoot();
      root.render(element);
    }
  } catch (err) {
    console.error("[xanix] render failed", err);
    // if (mode === "navigation") location.assign(route.path); // hard-navigate fallback
  }
};
