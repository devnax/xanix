import { useState, useEffect } from "react";
import useRequest from "./useRequest.js";

const useLocation = () => {
  const req: any = useRequest();
  let _url = __XANIX_SERVER__
    ? new URL(req.originalUrl, `${req.protocol}://${req.get("host")}`)
    : new URL(window.location.href);

  const [url, setUrl] = useState(_url);
  useEffect(() => {
    const onNavigate = () => setUrl(new URL(window.location.href));
    window.addEventListener("xanix:navigate:end", onNavigate);
    return () => {
      window.removeEventListener("xanix:navigate:end", onNavigate);
    };
  }, []);
  return url;
};

export default useLocation;
