import useDocument from "./useDocument";

const usePage = () => {
  const { pageId, props }: any = useDocument();
  return {
    pageId,
    props,
  };
};

export default usePage;
