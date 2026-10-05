import type { Request, Response } from "express";
import xanix from "./server/index.js";

import Link from "./components/Link.js";
import Document, { DocumentProps } from "./components/Document.js";
import Head from "./components/Head.js";
import Body from "./components/Body.js";
import Script from "./components/Script.js";

// hooks
import useDocument from "./hooks/useDocument.js";
import useMetadata from "./hooks/useMetadata.js";
import useLocation from "./hooks/useLocation.js";
import useParams from "./hooks/useParams.js";
import usePathname from "./hooks/usePathname.js";
import useSearchParams from "./hooks/useSearchParams.js";
import usePage from "./hooks/usePage.js";
import useRequest from "./hooks/useRequest.js";
import useResponse from "./hooks/useResponse.js";
import useHeaders from "./hooks/useHeaders.js";
import useCookies, { CookieOptions } from "./hooks/useCookies.js";
import useServer from "./hooks/useServer.js";
import { useStore, createStore, createStoreRef } from "./hooks/useStore.js";
import server from "./hooks/server.js";
import cache, { XanixCache } from "./hooks/cache.js";
import createContext from "./hooks/createContext.js";

export * from "./utils.js";

export type { CookieOptions };

export type XanixDocumentProps = DocumentProps & {
  request?: Request;
  metadata: Record<string, any>;
  page: {
    id: string;
    props: Record<string, any>;
  };
};

export type DocumentMetadata = {
  request: Request;
  response: Response;
  page: {
    id: string;
    name: string;
    props: Record<string, any>;
  };
};

// navigate
import { navigate, back, forward, preload, reload } from "./navigate.js";

export {
  xanix,
  Link,
  Document,
  Head,
  Body,
  Script,

  // hooks
  useDocument,
  useMetadata,
  useLocation,
  useParams,
  usePathname,
  useSearchParams,
  usePage,
  useRequest,
  useResponse,
  useHeaders,
  useCookies,
  useServer,
  useStore,
  createStore,
  createStoreRef,
  createContext,
  server,
  cache,
  XanixCache,

  // navigation
  navigate,
  back,
  forward,
  preload,
  reload,
};
