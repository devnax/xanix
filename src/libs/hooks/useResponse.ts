import useDocument from "./useDocument.js";

const useResponse = () => {
  if (__XANIX_SERVER__) {
    const { response } = useDocument();
    return response;
  }
};

export default useResponse;
