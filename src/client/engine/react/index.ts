import "virtual:react-refresh";
import { createElement } from "react";
import { hydrateRoot, createRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import type { RenderContext, XanixRoute } from "virtual:xanix-route";

let _root: Root | null = null;
const getRoot = (): Root => (_root = _root ?? createRoot(document));

const getProps = async (route: XanixRoute) => {
  const res = await fetch(route.path, {
    method: "GET",
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Failed to load ${route.path}: ${res.status}`);
  const data = await res.json();
  return {
    props: data.props ?? {},
    path: res.headers.get("path") ?? route.path,
  };
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
      const data = await getProps(route);
      const element = await renderClient(route, data.props);

      if (location.pathname + location.search !== data.path) {
        history.pushState(null, "", data.path);
      }
      // an unmounted root can't be reused

      const root = getRoot();
      root.render(element);
    } else {
      const data = window.__XANIX_DATA__ ?? { props: {} };
      const element = await renderClient(route, data.props);
      const root = getRoot();
      root.render(element);
      window.__XANIX_DATA__ = null as any;
    }
  } catch (err) {
    console.error("[xanix] render failed", err);
    // if (mode === "navigation") location.assign(route.path); // hard-navigate fallback
  }
};
