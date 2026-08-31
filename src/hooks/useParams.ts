import useDocument from "../hooks/useDocument.js";

const useParams = () => {
  const { params } = useDocument();
  return params;
};

export default useParams;
