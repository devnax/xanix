import useDocument from "./useDocument.js";

const useRequest = () => {
  if (__XANIX_SERVER__) {
    const { request } = useDocument();
    return request;
  }
};

export default useRequest;
