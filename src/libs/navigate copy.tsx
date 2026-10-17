import XanixRedirect from "./classes/XanixRedirect.js";
import xanix from "./xanix/index.js";
import {
  DocumentProvider,
  type DocumentContextData,
} from "./components/DocumentContext.js";
import type { ComponentType } from "react";
import { createRoot, type Root, hydrateRoot } from "react-dom/client";
import Document from "virtual:xanix-document";
import { decode } from "./encoder.js";

type DocumentInfo = DocumentContextData & {
  component: any;
};

const getPath = () => {
  const { pathname, search } = window.location;
  return search ? `${pathname}${search}` : pathname;
};

let _root: Root | null = null;
const getRoot = (): Root => (_root = _root ?? createRoot(document));
const getPages = async () => (await import("virtual:xanix-pages")).default;

const getDocument = async (path: string) => {
  let win: any = window;
  const windoc = win.__XDOCUMENT;
  if (windoc && windoc.page && windoc.page.id) {
    win.__XDOCUMENT = null;
    return windoc;
  }

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
      return _doc;
    }
  } catch (error) {}
  xanix.emit("navigation:error", {
    error: new Error(`Failed to fetch page for path ${path}`),
    path,
    request: undefined,
    response: undefined,
  });
  throw new Error(`Failed to fetch page for path ${path}`);
};

async function mount(Component: ComponentType<any>, doc: DocumentInfo) {
  const root = getRoot();
  root.render(
    <DocumentProvider value={doc}>
      <Document document={doc}>
        <Component {...doc.page.props} />
      </Document>
    </DocumentProvider>,
  );
}

export const navigate = (
  path: string = getPath(),
  options?: { status?: number; pop?: boolean },
) => {
  if (__XANIX_SERVER__) {
    throw new XanixRedirect(options?.status ?? 302, path);
  }

  xanix.emit("navigate:start", { path });

  getDocument(path)
    .then(async (doc: any) => {
      const pages = await getPages();
      const mod = await pages[doc.page.id]();
      mount(mod.default, doc);
      if (!options?.pop) {
        history.pushState(null, "", doc.path);
      }
      xanix.emit("navigate:end", doc);
    })
    .catch((error) => {
      console.error("[Xanix Navigation] Failed to navigate:", error);
    });
};

export const preload = (path: string) => {
  if (__XANIX_CLIENT__) {
    xanix.emit("preload:start", { path });
    getDocument(path).then(async (doc) => {
      const pages = await getPages();
      await pages[doc.page.id]();
      xanix.emit("preload:end", doc);
    });
  } else {
    throw new Error("Preload can only be called on the client side");
  }
};

export const reload = (hard = false) => {
  if (__XANIX_CLIENT__) {
    if (hard) {
      window.location.reload();
      return;
    }
    const path = getPath();
    xanix.emit("navigate:start", { path });

    getDocument(path).then(async (doc: any) => {
      const pages = await getPages();
      const mod = await pages[doc.page.id]();
      mount(mod.default, doc);
      xanix.emit("navigate:end", doc);
    });
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
