import useRequest from "./useRequest";

const useHeaders = () => {
  const request = useRequest();
  if (__XANIX_SERVER__) {
    return request?.headers;
  }
  return {};
};

export default useHeaders;
