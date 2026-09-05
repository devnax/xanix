import type { Request } from "express";
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
import useServer, { registerUseServer } from "./hooks/useServer/index.js";

export * from "./utils.js";

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

export {
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
  registerUseServer,

  // navigation
  navigate,
  back,
  forward,
  preload,
  onNavigateStart,
  onNavigateEnd,
  reload,
};

export type { CookieOptions };

export type XanixDocumentProps = DocumentProps & {
  request?: Request;
  metadata: Record<string, any>;
  page: {
    id: string;
    props: Record<string, any>;
  };
};
