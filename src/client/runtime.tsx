import type { ComponentType } from "react";
import { createRoot, type Root } from "react-dom/client";
import { XanixDocumentData } from "../components/Document/context";

type Page = XanixDocumentData & {
  component: ComponentType<any>;
};
const pages = new Map<string, Page>();
const ROOT_KEY = "__xanix_root__";

export const getPath = () => {
  const { pathname, search } = window.location;
  return search ? `${pathname}${search}` : pathname;
};

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

export async function mount(path: string, page: Page) {
  const root = getRoot();
  pages.set(path, page);
  const { component: Component, props } = page;
  const Document = (await import(getImportUrl("xanix-document"))).default;
  root.render(
    <Document
      document={{
        pageId: page.pageId,
        props: page.props,
        title: page.title,
        meta: page.meta,
      }}
    >
      <Component {...props} />
    </Document>,
  );
}

if (typeof window !== "undefined") {
  window.addEventListener("load", async () => {
    const { pageId, props, title, meta } = (window as any).XANIX_DOCUMENT;
    const mod = await import(getImportUrl(pageId));
    const scriptTag = document.getElementById(pageId);
    mount(getPath(), {
      component: mod.default,
      pageId,
      props,
      meta,
      title,
    });
    if (scriptTag) {
      scriptTag.remove();
    }
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
      meta: page.meta,
      title: page.title,
    });
  });
}
