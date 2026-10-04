import XanixRedirect from "./classes/XanixRedirect.js";
import xanix from "./server/index.js";
import {
  DocumentProvider,
  type DocumentContextData,
} from "./components/DocumentContext.js";
import type { ComponentType } from "react";
import { createRoot, type Root } from "react-dom/client";
import outdirs from "./outdirs.js";
import Document from "virtual:xanix-document";
import { UseServerResult } from "./hooks/useServer.js";
import { decode } from "@msgpack/msgpack";

type DocumentInfo = DocumentContextData & {
  component: any;
};

export const documents = new Map<string, DocumentInfo>();
const ROOT_KEY = "__xanix_root__";

const getPath = () => {
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
  let win: any = window;
  const windoc = win.__XDOCUMENT;
  if (windoc && windoc.page && windoc.page.id) {
    const pageData = win.__XPAGEDATA;
    windoc.pagedata = pageData;
    win.__XDOCUMENT = null;
    win.__XPAGEDATA = null;
    if (windoc.pagedata) {
      for (const [key, value] of Object.entries(windoc.pagedata)) {
        UseServerResult.set(key, value);
      }
    }
    return windoc;
  }

  let doc = documents.get(path);
  if (doc) return doc;

  const res = await fetch(path, {
    headers: {
      "x-xanix-page": __XANIX_PAGE_NAVIGATION_HEADER_VALUE__,
      "Content-Type": "application/xanix",
    },
  });

  try {
    const buffer = await res.arrayBuffer();
    const _doc: DocumentInfo = decode(
      new Uint8Array(buffer),
    ) as unknown as DocumentInfo;
    if (_doc?.page && _doc?.page?.id && _doc?.params && _doc?.metadata) {
      if (_doc.pagedata) {
        for (const [key, value] of Object.entries(_doc.pagedata)) {
          UseServerResult.set(key, value);
        }
      }
      return _doc;
    }
  } catch (error) {}
  throw new Error(`Failed to fetch page for path ${path}`);
};

async function mount(
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

export const navigate = async (
  path: string = getPath(),
  options?: { status?: number; pop?: boolean },
) => {
  if (__XANIX_SERVER__) {
    throw new XanixRedirect(options?.status ?? 302, path);
  } else {
    xanix.emit("navigate:start", { path });
    const doc: any = await getDocument(path);
    const mod = await import(getImportUrl(doc.page.id));
    mount(path, mod.default, doc);
    if (!options?.pop) {
      history.pushState(null, "", doc.path);
    }
    xanix.emit("navigate:end", doc);
  }
};

export const preload = async (path: string) => {
  if (__XANIX_CLIENT__) {
    xanix.emit("preload:start", { path });
    const doc = await getDocument(path);
    await import(getImportUrl(doc.page.id));
    documents.set(path, doc);
    xanix.emit("preload:end", doc);
  } else {
    throw new Error("Preload can only be called on the client side");
  }
};

export const reload = async (hard = false) => {
  if (__XANIX_CLIENT__) {
    if (hard) {
      window.location.reload();
    } else {
      const path = getPath();
      xanix.emit("navigate:start", { path });
      const doc: any = await getDocument(path);
      const mod = await import(getImportUrl(doc.page.id) + "?t=" + Date.now());
      mount(path, mod.default, doc);
      xanix.emit("navigate:end", doc);
    }
  } else {
    throw new Error("Reload can only be called on the client side");
  }
};

export const back = () => {
  if (__XANIX_CLIENT__) {
    window.history.back();
  } else {
    throw new Error("Back can only be called on the client side");
  }
};

export const forward = () => {
  if (__XANIX_CLIENT__) {
    window.history.forward();
  } else {
    throw new Error("Forward can only be called on the client side");
  }
};
