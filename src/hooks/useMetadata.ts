import useDocument from "./useDocument.js";

const useMetadata = () => {
  const doc = useDocument();
  return doc?.metadata ?? {};
};

export default useMetadata;
