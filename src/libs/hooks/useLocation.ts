import { useEffect, useState } from "react";
import useRequest from "./useRequest.js";

type XanixNavigateEvent = CustomEvent<{
  path: string;
}>;

const useLocation = () => {
  const req: any = useRequest();

  const [url, setUrl] = useState<URL>(() => {
    if (__XANIX_SERVER__) {
      return new URL(req.originalUrl, `${req.protocol}://${req.get("host")}`);
    }
    return new URL(window.location.href);
  });

  useEffect(() => {
    /**
     * Update the location state only when the URL
     * has actually changed.
     */
    const update = (nextUrl: URL) => {
      setUrl((currentUrl) => {
        if (currentUrl.href === nextUrl.href) {
          return currentUrl;
        }
        return nextUrl;
      });
    };

    /**
     * Xanix client navigation.
     *
     * Example:
     *
     * navigate("/about")
     *
     * should eventually dispatch:
     *
     * window.dispatchEvent(
     *   new CustomEvent(XANIX_NAVIGATE_END, {
     *     detail: {
     *       path: "/about",
     *     },
     *   }),
     * );
     */
    const onNavigate = (event: Event) => {
      const { path } = (event as XanixNavigateEvent).detail;
      if (!path) {
        return;
      }

      const nextUrl = new URL(path, window.location.origin);
      update(nextUrl);
    };

    /**
     * Browser Back / Forward.
     */
    const onPopState = () => {
      update(new URL(window.location.href));
    };

    window.addEventListener(XANIX_NAVIGATE_END, onNavigate);
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener(XANIX_NAVIGATE_END, onNavigate);
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  return url;
};

export default useLocation;
