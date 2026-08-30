## xanix/navigation - done
  navigate,
  replace,
  back,
  forward,
  reload,
  useLocation,
  useNavigate

## xanix/router
  useParams,
  useSearchParams,
  usePathname,
  useRoute, - dep

## xanix/document - done
  Document,
  Head,
  Title,
  Meta,
  Script,
  Styles,


  import {
  useRequest,
  useHeaders,
  useCookies,
} from "xanix/server";


import {
  usePage,
  usePageProps,
} from "xanix";

import {
  isClient,
  isServer,
} from "xanix";
export const isClient = __XANIX_CLIENT__;
export const isServer = !__XANIX_CLIENT__;

export {
  isDevelopment,
  isProduction,
};