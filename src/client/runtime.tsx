import type { ComponentType } from "react";
import { createRoot, type Root } from "react-dom/client";
import React from "react";
export const RouteContext = React.createContext<string>("");

type Page = {
  component: ComponentType<any>;
  props: any;
  pageId: string;
};

const pages = new Map<string, Page>();
const ROOT_KEY = "__xanix_root__";

type XanixRootElement = HTMLElement & {
  [ROOT_KEY]?: Root;
};

export const getPath = () => {
  const path = window.location.pathname;
  const search = window.location.search;
  return search ? `${path}${search}` : path;
};

export const getImportUrl = (pageId: string) => {
  return `/.xanix/client/pages/${pageId}.js`;
};

function getElement(): XanixRootElement {
  const ele = document.getElementById("root");
  if (!ele) {
    throw new Error("Root element not found");
  }
  return ele as XanixRootElement;
}

function getRoot(ele: XanixRootElement): Root {
  if (!ele[ROOT_KEY]) {
    ele[ROOT_KEY] = createRoot(ele);
  }
  return ele[ROOT_KEY];
}

export const getPage = async (path = getPath()) => {
  let page = pages.get(path);
  if (!page) {
    const response = await fetch(path, {
      headers: {
        "X-Navigation": "true",
      },
    });
    page = await response.json();
  }
  return page;
};

export function mount(path: string, page: Page) {
  const ele = getElement();
  const root = getRoot(ele);
  pages.set(path, page);
  const { component: Component, props } = page;
  root.render(<Component {...props} />);
}

export const reload = async () => {
  const path = getPath();
  let page: any = await getPage(path);
  const mod = await import(getImportUrl(page.pageId) + `?t=${Date.now()}`);
  mount(path, {
    pageId: page.pageId,
    component: mod.default,
    props: page.props,
  });
};

if (typeof window !== "undefined") {
  (window as any).xanix = async (data: { pageId: string; props: any }) => {
    const { pageId, props } = data;
    const mod = await import(getImportUrl(pageId));

    mount(getPath(), {
      pageId,
      component: mod.default,
      props,
    });
    const scriptTag = document.getElementById("xanix-data");
    if (scriptTag) {
      scriptTag.remove();
    }
  };

  window.addEventListener("popstate", async () => {
    const path = getPath();
    let page: any = await getPage(path);
    const mod = await import(getImportUrl(page.pageId));
    mount(path, {
      pageId: page.pageId,
      component: mod.default,
      props: page.props,
    });
  });
}

const ws = new WebSocket("ws://localhost:8080");

ws.onopen = () => {
  ws.send("Hello");
};

ws.onmessage = async (event) => {
  await reload();
};
