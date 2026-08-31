import type { DocumentContextData } from "./components/DocumentContext.js";
import type { ComponentType } from "react";
import { createRoot, type Root } from "react-dom/client";

type DocumentInfo = DocumentContextData & {
  component: ComponentType<any>;
};

const pages = new Map<string, DocumentInfo>();
const ROOT_KEY = "__xanix_root__";

export const getPath = () => {
  const { pathname, search } = window.location;
  return search ? `${pathname}${search}` : pathname;
};

export const getImportUrl = (pageId: string) => `/.xanix/client/${pageId}.js`;

function getRoot(): Root {
  let ele: any = document.body;
  if (!ele) {
    throw new Error("Root element not found");
  }
  ele[ROOT_KEY] = ele[ROOT_KEY] ?? createRoot(ele);
  return ele[ROOT_KEY];
}

export const getPage = async (path: string) => {
  let page = pages.get(path);
  if (page) return page;
  const response = await fetch(path, {
    headers: {
      "X-Navigation": "true",
    },
  });
  if (!response.ok) {
    return null;
  }
  return await response.json();
};

export async function mount(
  path: string,
  Component: ComponentType<any>,
  doc: DocumentInfo,
) {
  const root = getRoot();
  pages.set(path, doc);
  const Document = (await import(getImportUrl("xanix-document"))).default;

  root.render(
    <Document document={doc}>
      <Component {...doc.props} />
    </Document>,
  );
}

if (typeof window !== "undefined") {
  const dispatch = (name: string, path: string) => {
    window.dispatchEvent(
      new CustomEvent(`xanix:${name}`, { detail: { path } }),
    );
  };

  window.addEventListener("load", async () => {
    const path = getPath();
    dispatch("navigate:start", path);
    const doc = (window as any).XANIX_DOCUMENT;
    const mod = await import(getImportUrl(doc.pageId));
    mount(path, mod.default, doc);
    const scriptTag = document.getElementById(doc.pageId);
    if (scriptTag) {
      scriptTag.remove();
    }
    dispatch("navigate:end", path);
  });

  window.addEventListener("xanix:navigate", async (event: any) => {
    const path = event.detail.path;
    const replace = event.detail.replace;
    dispatch("navigate:start", path);
    let page: any = await getPage(path);
    if (!page) return;
    const mod = await import(getImportUrl(page.pageId));
    mount(path, mod.default, page);
    if (replace) {
      history.replaceState(null, "", path);
    } else {
      history.pushState(null, "", path);
    }
    dispatch("navigate:end", path);
  });

  window.addEventListener("xanix:preload", async (event: any) => {
    const path = event.detail.path;
    if (!path) return;
    dispatch("preload:start", path);
    const page = await getPage(path);
    if (!page) return;
    await import(getImportUrl(page.pageId));
    pages.set(path, page);
    dispatch("preload:end", path);
  });

  window.addEventListener("xanix:reload", async (event: any) => {
    const path = getPath();
    dispatch("navigate:start", path);
    let page: any = await getPage(path);
    if (!page) return;
    const mod = await import(getImportUrl(page.pageId) + "?t=" + Date.now());
    mount(path, mod.default, page);
    history.pushState(null, "", path);
    dispatch("navigate:end", path);
  });

  window.addEventListener("popstate", async () => {
    const path = getPath();
    dispatch("navigate", path);
  });
}
