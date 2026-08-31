import useDocument from "./useDocument";

const useRequest = () => {
  const { request } = useDocument();
  if (__XANIX_SERVER__) {
    return request;
  }
};

export default useRequest;
