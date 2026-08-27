import { createContext, useContext } from "react";
import { XanixDocumentData } from "../../types";

export const DocumentContext = createContext<XanixDocumentData>({
  pageId: "",
  props: {},
  title: "",
  meta: [],
  runtime: `/.xanix/client/xanix-runtime.js`,
});

export const useDocument = () => {
  const context = useContext(DocumentContext);
  if (!context) {
    throw new Error("useDocument must be used within a DocumentProvider");
  }
  return context;
};
