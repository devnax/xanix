import type { DocumentContextData } from "./components/DocumentContext.js";
import type { ComponentType } from "react";
import { createRoot, type Root } from "react-dom/client";
import outdirs from "./outdirs.js";

type DocumentInfo = DocumentContextData & {
  component: ComponentType<any>;
};

const pages = new Map<string, DocumentInfo>();
const ROOT_KEY = "__xanix_root__";

export const getPath = () => {
  const { pathname, search } = window.location;
  return search ? `${pathname}${search}` : pathname;
};

export const getImportUrl = (pageId: string) =>
  `/${outdirs.client}/${pageId}.js`;

function getRoot(): Root {
  let ele: any = document.body;
  if (!ele) {
    throw new Error("Root element not found");
  }
  ele[ROOT_KEY] = ele[ROOT_KEY] ?? createRoot(ele);
  return ele[ROOT_KEY];
}

const getPage = async (path: string) => {
  let page = pages.get(path);
  if (page) return page;
  const response = await fetch(path, {
    headers: {
      "x-xanix-page": __XANIX_PAGE_NAVIGATION_HEADER_VALUE__,
    },
  });
  try {
    const page = await response.json();
    if (!page) return null;
    if (page.pageId && page.props && page.params && page.metadata) {
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
  const Document = (await import("virtual:xanix-document")).default;

  root.render(
    <Document
      document={doc}
      metadata={doc.metadata}
      page={{ id: doc.pageId, props: doc.props }}
      request={doc.request}
      response={doc.response}
    >
      <Component {...doc.props} />
    </Document>,
  );
}

if (__XANIX_CLIENT__) {
  const dispatch = (name: string, path: string) => {
    window.dispatchEvent(new CustomEvent(name, { detail: { path } }));
  };

  window.addEventListener("load", async () => {
    const page = (window as any).XANIX_DOCUMENT;
    const path = page.path;
    dispatch(XANIX_NAVIGATE_START, path);
    const mod = await import(getImportUrl(page.pageId));
    mount(path, mod.default, page);
    const scriptTag = document.getElementById(page.pageId);
    if (scriptTag) {
      scriptTag.remove();
    }
    history.pushState(null, "", page.path);
    dispatch(XANIX_NAVIGATE_END, path);
  });

  window.addEventListener("popstate", async () => {
    dispatch(XANIX_NAVIGATE, getPath());
  });

  window.addEventListener(XANIX_NAVIGATE, async (event: any) => {
    const { path, replace } = event.detail;
    dispatch(XANIX_NAVIGATE_START, path);
    let page: any = await getPage(path);
    if (!page) return;
    const mod = await import(getImportUrl(page.pageId));
    mount(path, mod.default, page);
    dispatch(XANIX_NAVIGATE_END, page.path);
    if (replace) {
      history.replaceState(null, "", page.path);
    } else {
      history.pushState(null, "", page.path);
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
    dispatch(XANIX_PRELOAD_END, page.path);
  });

  window.addEventListener(XANIX_NAVIGATE_RELOAD, async (event: any) => {
    const path = getPath();
    dispatch(XANIX_NAVIGATE_START, path);
    let page: any = await getPage(path);
    if (!page) return;
    const mod = await import(getImportUrl(page.pageId) + "?t=" + Date.now());
    mount(path, mod.default, page);
    dispatch(XANIX_NAVIGATE_END, page.path);
  });
}
