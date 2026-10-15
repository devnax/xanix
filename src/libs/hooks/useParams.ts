import useDocument from "./useDocument.js";

const useParams = () => {
  const { params } = useDocument();
  return params;
};

export default useParams;
