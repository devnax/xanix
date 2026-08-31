import Link from "./components/Link.js";
import Document, { DocumentProps } from "./components/Document.js";
import Head from "./components/Head.js";
import Body from "./components/Body.js";
import Script from "./components/Script.js";

// hooks
import useDocument from "./hooks/useDocument.js";
import useLocation from "./hooks/useLocation.js";
import useParams from "./hooks/useParams.js";
import usePathname from "./hooks/usePathname.js";
import useSearchParams from "./hooks/useSearchParams.js";
import usePage from "./hooks/usePage.js";
import useRequest from "./hooks/useRequest.js";
import useHeaders from "./hooks/useHeaders.js";
import useCookies from "./hooks/useCookies.js";

// navigate
import {
  navigate,
  back,
  forward,
  preload,
  onNavigateStart,
  onNavigateEnd,
  reload,
} from "./navigate.js";

export const isClient = __XANIX_CLIENT__;
export const isServer = __XANIX_SERVER__;
export const isDevelopment = __XANIX_DEV__;
export const isProduction = __XANIX_PROD__;

export {
  Link,
  Document,
  Head,
  Body,
  Script,

  // hooks
  useDocument,
  useLocation,
  useParams,
  usePathname,
  useSearchParams,
  usePage,
  useRequest,
  useHeaders,
  useCookies,

  // navigate
  navigate,
  back,
  forward,
  preload,
  onNavigateStart,
  onNavigateEnd,
  reload,
};

export type * from "./types";
export type { DocumentProps };
