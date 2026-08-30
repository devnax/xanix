import useDocument from "../document/useDocument.js";

export const usePathname = () => {
  if (__XANIX_CLIENT__) {
    return window.location.pathname;
  }
  const { request } = useDocument();
  return request?.path;
};
