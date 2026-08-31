import useDocument from "./useDocument.js";

const usePage = () => {
  const { pageId, props }: any = useDocument();
  return {
    pageId,
    props,
  };
};

export default usePage;
