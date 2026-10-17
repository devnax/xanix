import "virtual:react-refresh";

import { createElement, type ReactNode } from "react";
import { createRoot, hydrateRoot, type Root } from "react-dom/client";
import type { RenderContext, XanixRoute } from "virtual:xanix-route";
import { exit } from "../../../bundler/client/Route";

let _root: Root | null = null;

const getProps = async (route: XanixRoute) => {
  const response = await fetch(route.path);

  if (!response.ok) {
    throw new Error(`Failed to fetch ${route.path}: ${response.status}`);
  }

  const html = await response.text();
  const doc = new DOMParser().parseFromString(html, "text/html");
  const script = doc.getElementById("__XANIX_DATA__");

  let data = { props: {} as Record<string, any>, path: route.path };

  if (script?.textContent) {
    data = (0, eval)(script.textContent);
    window.__XANIX_DATA__ = data;
  }

  return { doc, data };
};

const renderClient = async (route: XanixRoute, props: Record<string, any>) => {
  const page = route.page as () => Promise<any>;
  const layouts = (route.layouts ?? []) as (() => Promise<any>)[];

  const [Page, ...loadedLayouts] = await Promise.all([
    page(),
    ...layouts.map((load) => load()),
  ]);

  return loadedLayouts.reduceRight(
    (children: ReactNode, Layout) =>
      createElement(Layout.default, {}, children),
    createElement(Page.default, props),
  );
};

export const onExit = () => {
  _root?.unmount();
  _root = null;
};

export const render = async ({ route, mode }: RenderContext) => {
  try {
    let data = window.__XANIX_DATA__ ?? { props: {} };

    if (mode === "navigation") {
      const { doc, data } = await getProps(route);
      const element = await renderClient(route, data.props ?? {});

      // document.documentElement.replaceWith(
      //   document.importNode(doc.documentElement, true),
      // );

      if (data.path && location.pathname + location.search !== data.path) {
        history.pushState(null, "", data.path);
      }

      await exit();
      _root?.unmount();
      _root = createRoot(document);
      _root.render(element);
      // _root = hydrateRoot(document, element);
      return;
    }

    const element = await renderClient(route, data.props ?? {});
    await exit();
    _root = hydrateRoot(document, element);
  } catch (err) {
    console.error("[xanix] render failed", err);
  }
};
