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
  try {
    const page = await response.json();
    if (!page) return null;
    if (page.pageId && page.props && page.meta && page.params) {
      return page;
    }
    throw new Error("Invalid page structure");
  } catch (error) {
    console.error("Failed to fetch page:", error);
  }
  return null;
};
export async function mount(
  path: string,
  Component: ComponentType<any>,
  doc: DocumentInfo,
) {
  const root = getRoot();
  pages.set(path, doc);
  const Document = (await import(getImportUrl(__XANIX_DOCUMENT_FILE_NAME__)))
    .default;

  root.render(
    <Document document={doc}>
      <Component {...doc.props} />
    </Document>,
  );
}

if (__XANIX_CLIENT__) {
  const dispatch = (name: string, path: string) => {
    window.dispatchEvent(new CustomEvent(name, { detail: { path } }));
  };

  window.addEventListener("load", async () => {
    const path = getPath();
    dispatch(XANIX_NAVIGATE_START, path);
    const doc = (window as any).XANIX_DOCUMENT;
    const mod = await import(getImportUrl(doc.pageId));
    mount(path, mod.default, doc);
    const scriptTag = document.getElementById(doc.pageId);
    if (scriptTag) {
      scriptTag.remove();
    }
    dispatch(XANIX_NAVIGATE_END, path);
  });

  window.addEventListener("popstate", async () => {
    dispatch(XANIX_NAVIGATE, getPath());
  });

  window.addEventListener(XANIX_NAVIGATE, async (event: any) => {
    const { path, replace } = event.detail;
    const currentPath = getPath();
    if (path === currentPath) return;

    const url = new URL(path, window.location.origin);
    const prevUrl = new URL(currentPath, window.location.origin);
    const isSamePath = url.pathname === prevUrl.pathname;

    dispatch(XANIX_NAVIGATE_START, path);
    let page: any = await getPage(path);
    if (!page) return;
    if (!isSamePath) {
      const mod = await import(getImportUrl(page.pageId));
      mount(path, mod.default, page);
    }
    dispatch(XANIX_NAVIGATE_END, path);
    if (replace) {
      history.replaceState(null, "", path);
    } else {
      history.pushState(null, "", path);
    }
  });

  window.addEventListener(XANIX_PRELOAD, async (event: any) => {
    const path = event.detail.path;
    if (!path) return;
    dispatch(XANIX_PRELOAD_START, path);
    const page = await getPage(path);
    if (!page) return;
    await import(getImportUrl(page.pageId));
    pages.set(path, page);
    dispatch(XANIX_PRELOAD_END, path);
  });

  window.addEventListener(XANIX_NAVIGATE_RELOAD, async (event: any) => {
    const path = getPath();
    dispatch(XANIX_NAVIGATE_START, path);
    let page: any = await getPage(path);
    if (!page) return;
    const mod = await import(getImportUrl(page.pageId) + "?t=" + Date.now());
    mount(path, mod.default, page);
    history.pushState(null, "", path);
    dispatch(XANIX_NAVIGATE_END, path);
  });
}
