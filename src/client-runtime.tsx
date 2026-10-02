import {
  DocumentProvider,
  type DocumentContextData,
} from "./components/DocumentContext.js";
import type { ComponentType } from "react";
import { createRoot, type Root } from "react-dom/client";
import outdirs from "./outdirs.js";
import Document from "virtual:xanix-document";
import "./dev.js";

type DocumentInfo = DocumentContextData & {
  component: any;
};

const documents = new Map<string, DocumentInfo>();
const ROOT_KEY = "__xanix_root__";

export const getPath = () => {
  const { pathname, search } = window.location;
  return search ? `${pathname}${search}` : pathname;
};

export const getImportUrl = (file: string) => `/${outdirs.client}/${file}.js`;

function getRoot(): Root {
  let ele: any = document.body;
  if (!ele) {
    throw new Error("Root element not found");
  }
  ele[ROOT_KEY] = ele[ROOT_KEY] ?? createRoot(ele);
  return ele[ROOT_KEY];
}

const getDocument = async (path: string) => {
  let doc = documents.get(path);
  if (doc) return doc;
  const response = await fetch(path, {
    headers: {
      "x-xanix-page": __XANIX_PAGE_NAVIGATION_HEADER_VALUE__,
    },
  });
  try {
    const doc = await response.json();
    if (!doc) return null;
    if (doc.page && doc.page.id && doc.params && doc.metadata) {
      return doc;
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
  documents.set(path, doc);

  root.render(
    <DocumentProvider value={doc}>
      <Document>
        <Component {...doc.page.props} />
      </Document>
    </DocumentProvider>,
  );
}

const dispatch = (name: string, path: string) => {
  window.dispatchEvent(new CustomEvent(name, { detail: { path } }));
};

window.addEventListener("load", async () => {
  const doc = (window as any).__XDOCUMENT;
  if (!doc || !doc.page || !doc.page.id) return;
  const path = doc.path;
  dispatch(XANIX_NAVIGATE_START, path);
  const mod = await import(getImportUrl(doc.page.id));
  mount(path, mod.default, doc);
  const scriptTag = document.getElementById(doc.page.id);
  if (scriptTag) {
    scriptTag.remove();
  }
  history.pushState(null, "", doc.path);
  dispatch(XANIX_NAVIGATE_END, path);
});

window.addEventListener("popstate", async () => {
  dispatch(XANIX_NAVIGATE, getPath());
});

window.addEventListener(XANIX_NAVIGATE, async (event: any) => {
  const { path, replace } = event.detail;
  let doc: any = await getDocument(path);
  if (!doc || !doc.page || !doc.page.id) return;
  dispatch(XANIX_NAVIGATE_START, path);
  const mod = await import(getImportUrl(doc.page.id));
  mount(path, mod.default, doc);
  dispatch(XANIX_NAVIGATE_END, doc.path);
  if (replace) {
    history.replaceState(null, "", doc.path);
  } else {
    history.pushState(null, "", doc.path);
  }
});

window.addEventListener(XANIX_PRELOAD, async (event: any) => {
  const path = event.detail.path;
  if (!path) return;
  dispatch(XANIX_PRELOAD_START, path);
  const page = await getDocument(path);
  if (!page) return;
  await import(getImportUrl(page.page.id));
  documents.set(path, page);
  dispatch(XANIX_PRELOAD_END, page.path);
});

window.addEventListener(XANIX_NAVIGATE_RELOAD, async () => {
  const path = getPath();
  dispatch(XANIX_NAVIGATE_START, path);
  let doc: any = await getDocument(path);
  if (!doc) return;
  const mod = await import(getImportUrl(doc.page.id) + "?t=" + Date.now());
  mount(path, mod.default, doc);
  dispatch(XANIX_NAVIGATE_END, doc.path);
});
