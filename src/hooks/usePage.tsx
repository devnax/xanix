import useDocument from "./useDocument.js";

const usePage = () => {
  const { page } = useDocument();
  return page;
};

export default usePage;
