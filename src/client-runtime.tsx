import {
  DocumentProvider,
  type DocumentContextData,
} from "./components/DocumentContext.js";
import type { ComponentType } from "react";
import { createRoot, type Root } from "react-dom/client";
import outdirs from "./outdirs.js";
import Document from "virtual:xanix-document";
import { UseServerResult } from "./hooks/useServer.js";
import xanix from "./server/index.js";
import "virtual:xanix-dev";

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
  const pageData = (window as any).__XPAGEDATA;

  if (pageData) {
    for (const [key, value] of Object.entries(pageData)) {
      UseServerResult.set(key, value);
    }
  }
  xanix.emit("load:start", path);
  const mod = await import(getImportUrl(doc.page.id));
  mount(path, mod.default, doc);
  const scriptTag = document.getElementById(doc.page.id);
  if (scriptTag) {
    scriptTag.remove();
  }
  history.pushState(null, "", doc.path);
  xanix.emit("load:end", path);
});

window.addEventListener("popstate", async () => {
  dispatch(XANIX_NAVIGATE, getPath());
});

xanix.on("navigate", async (info: any) => {
  const { path, replace } = info;
  const doc: any = await getDocument(path);
  if (!doc || !doc.page || !doc.page.id) return;

  if (doc.pagedata) {
    for (const [key, value] of Object.entries(doc.pagedata)) {
      UseServerResult.set(key, value);
    }
  }

  xanix.emit("navigate:start", path);
  const mod = await import(getImportUrl(doc.page.id));
  mount(path, mod.default, doc);
  xanix.emit("navigate:end", doc.path);
  if (replace) {
    history.replaceState(null, "", doc.path);
  } else {
    history.pushState(null, "", doc.path);
  }
});

xanix.on("reload", async () => {
  const path = getPath();
  xanix.emit("navigate:start", path);
  const doc: any = await getDocument(path);
  if (!doc || !doc.page || !doc.page.id) return;

  if (doc.pagedata) {
    for (const [key, value] of Object.entries(doc.pagedata)) {
      UseServerResult.set(key, value);
    }
  }

  UseServerResult.clear();
  const mod = await import(getImportUrl(doc.page.id) + "?t=" + Date.now());

  mount(path, mod.default, doc);
  xanix.emit("navigate:end", doc.path);
});

xanix.on("preload", async (path: string) => {
  if (!path) return;
  xanix.emit("preload:start", path);
  const doc = await getDocument(path);
  if (!doc || !doc.page || !doc.page.id) return;

  if (doc.pagedata) {
    for (const [key, value] of Object.entries(doc.pagedata)) {
      UseServerResult.set(key, value);
    }
  }

  await import(getImportUrl(doc.page.id));
  documents.set(path, doc);
  xanix.emit("preload:end", doc.path);
});
