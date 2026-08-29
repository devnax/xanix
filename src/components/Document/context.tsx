import { createContext, useContext } from "react";

export type XanixDocumentData = {
  pageId?: string;
  props: Record<string, any>;
  title: string;
  meta: Array<{ name: string; content: string }>;
};

export const DocumentContext = createContext<XanixDocumentData>({
  pageId: "",
  title: "",
  props: {},
  meta: [],
});

export const useDocument = () => {
  const context = useContext(DocumentContext);
  if (!context) {
    throw new Error("useDocument must be used within a DocumentProvider");
  }
  return context;
};
