import type { ComponentType } from "react";
import { createRoot, type Root } from "react-dom/client";

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
  if (search) {
    return `${path}${search}`;
  }
  return path;
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
  const host = window.location.origin;
  window.history.pushState({}, "", `${host}${path}`);
}

export const navigate = async (path: string) => {
  let page: any = await getPage(path);
  const mod = await import(getImportUrl(page.pageId));
  const Component = mod.default;

  mount(path, {
    pageId: page.pageId,
    component: Component,
    props: page.props,
  });
};

if (typeof window !== "undefined") {
  window.addEventListener("load", async () => {
    const ele = getElement();
    const pageId = ele.getAttribute("page");
    if (!pageId) {
      throw new Error("Page ID not found");
    }

    const mod = await import(getImportUrl(pageId));
    const Component = mod.default;
    const props = (window as any).PAGE_PROPS;

    mount(getPath(), {
      pageId,
      component: Component,
      props,
    });
  });

  window.addEventListener("popstate", async () => {
    const path = getPath();
    await navigate(path);
  });
}
