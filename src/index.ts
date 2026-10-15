import type { Request, Response } from "express";
import xanix from "./libs/xanix/index.js";

import Link from "./libs/components/Link.js";
// hooks
import useDocument from "./libs/hooks/useDocument.js";
import useMetadata from "./libs/hooks/useMetadata.js";
import useLocation from "./libs/hooks/useLocation.js";
import useParams from "./libs/hooks/useParams.js";
import usePathname from "./libs/hooks/usePathname.js";
import useSearchParams from "./libs/hooks/useSearchParams.js";
import usePage from "./libs/hooks/usePage.js";
import useRequest from "./libs/hooks/useRequest.js";
import useResponse from "./libs/hooks/useResponse.js";
import useHeaders from "./libs/hooks/useHeaders.js";
import useCookies, {
  cookieParser,
  CookieOptions,
} from "./libs/hooks/useCookies.js";
import useServer from "./libs/hooks/useServer.js";
import { useStore, createStore } from "./libs/hooks/useStore.js";
import server from "./libs/hooks/server.js";
import cache, { cacheFactory } from "./libs/hooks/cache.js";
import {
  createSession,
  useSession,
  withSession,
} from "./libs/hooks/session.js";

export * from "./include/constant.js";

export type { CookieOptions };

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
import { navigate, back, forward, preload, reload } from "./libs/navigate.js";

export {
  xanix,
  Link,

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
  cookieParser,
  useServer,
  useStore,
  createStore,
  server,
  cache,
  cacheFactory,
  createSession,
  useSession,
  withSession,

  // navigation
  navigate,
  back,
  forward,
  preload,
  reload,
};
