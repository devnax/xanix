import useRequest from "./useRequest.js";

const usePathname = () => {
  if (__XANIX_CLIENT__) {
    return window.location.pathname;
  }
  const request = useRequest();
  return request?.path;
};

export default usePathname;
