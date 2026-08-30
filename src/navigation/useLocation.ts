import { useDocument } from "../document/index.js";
import { useState, useEffect } from "react";

export const useLocation = () => {
  const _document = useDocument();
  const req: any = _document?.request;
  let _url;
  if (req) {
    _url = new URL(req.originalUrl, `${req.protocol}://${req.get("host")}`);
  } else {
    _url = new URL(window.location.href);
  }
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
