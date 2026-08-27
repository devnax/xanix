import type { ComponentType } from "react";
import { createRoot, type Root } from "react-dom/client";
import BaseDocument from "../BaseDocument.js";
import React, { Suspense } from "react";
export const RouteContext = React.createContext<string>("");

type Page = {
  component: ComponentType<any>;
  props: any;
  pageId: string;
};
const pages = new Map<string, Page>();
const ROOT_KEY = "__xanix_root__";

export const getPath = () => {
  const path = window.location.pathname;
  const search = window.location.search;
  return search ? `${path}${search}` : path;
};

function App({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <title>My App</title>
        <meta name="description" content="My app" />
      </head>
      <body>{children}</body>
    </html>
  );
}

export const getImportUrl = (pageId: string) => `/.xanix/client/${pageId}.js`;

function getRoot(): Root {
  let ele: any = document;
  if (!ele) {
    throw new Error("Root element not found");
  }
  ele[ROOT_KEY] = ele[ROOT_KEY] ?? createRoot(ele);
  return ele[ROOT_KEY];
}

export const getPage = async (path = getPath()) => {
  let page = pages.get(path);
  if (page) return page;
  const response = await fetch(path, {
    headers: {
      "X-Navigation": "true",
    },
  });
  return await response.json();
};

export function mount(path: string, page: Page) {
  const root = getRoot();
  pages.set(path, page);
  const { component: Component, props } = page;

  root.render(
    <BaseDocument
      document={{
        pageId: page.pageId,
        props: props,
        runtime: "",
        title: "",
        meta: [],
      }}
    >
      <Component {...props} />
    </BaseDocument>,
  );
}

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

  window.addEventListener("load", async () => {
    const pageId = (window as any).PAGE_ID;
    const props = (window as any).PROPS;
    const mod = await import(getImportUrl(pageId));

    mount(getPath(), {
      pageId,
      component: mod.default,
      props,
    });
  });

  // POPSTATE event listener for handling browser navigation (back/forward)
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
