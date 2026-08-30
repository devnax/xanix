import useDocument from "../document/useDocument.js";

export const useParams = () => {
  const { params } = useDocument();
  return params;
};
