import useRequest from "./useRequest.js";

const usePathname = () => {
  if (__XANIX_CLIENT__) {
    return window.location.pathname;
  } else {
    const request = useRequest();
    return request?.path;
  }
};

export default usePathname;
