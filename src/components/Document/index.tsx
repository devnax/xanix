import {
  ComponentType,
  HTMLProps,
  ReactNode,
  useEffect,
  useState,
} from "react";

import { DocumentContext, type XanixDocumentData } from "./context.js";

export type DocumentProps = HTMLProps<HTMLHtmlElement> & {
  document: XanixDocumentData;
  children: ReactNode;
};

type PageState = {
  document: XanixDocumentData;
  component: ComponentType<any> | null;
  props: any;
};

const XANIX_NAVIGATION = "xanix:navigate";

export const getPath = () => {
  const { pathname, search } = window.location;

  return search ? `${pathname}${search}` : pathname;
};

export const getImportUrl = (pageId: string) => `/.xanix/client/${pageId}.js`;

const pages = new Map<string, PageState>();

export const getPage = async (path = getPath()) => {
  const cached = pages.get(path);

  if (cached) {
    return cached;
  }

  const response = await fetch(path, {
    headers: {
      "X-Navigation": "true",
    },
  });

  const page = await response.json();

  const Component = (await import(getImportUrl(page.pageId))).default;

  const result: PageState = {
    document: {
      pageId: page.pageId,
      props: page.props,
      title: page.title,
      meta: page.meta,
    },
    component: Component,
    props: page.props,
  };

  pages.set(path, result);

  return result;
};

const Document = ({ document, children, ...props }: DocumentProps) => {
  const isClient = typeof window !== "undefined";

  const [page, setPage] = useState<PageState>(() => ({
    document,
    component: null,
    props: document.props,
  }));

  useEffect(() => {
    const load = async (path: string) => {
      const nextPage = await getPage(path);

      setPage(nextPage);
    };

    const handleNavigate = (event: Event) => {
      const customEvent = event as CustomEvent<{
        path: string;
      }>;

      load(customEvent.detail.path);
    };

    const handlePopState = () => {
      load(getPath());
    };

    window.addEventListener(XANIX_NAVIGATION, handleNavigate);

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener(XANIX_NAVIGATION, handleNavigate);

      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  if (!isClient) {
    return (
      <DocumentContext.Provider value={document}>
        <html {...props}>{children}</html>
      </DocumentContext.Provider>
    );
  }

  const Component = page.component;

  return (
    <DocumentContext.Provider value={page.document}>
      {Component ? <Component {...page.props} /> : children}
    </DocumentContext.Provider>
  );
};

export default Document;
