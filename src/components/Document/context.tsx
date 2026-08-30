import { createContext, useContext } from "react";

export type DocumentContextData = {
  pageId: string;
  props: Record<string, any>;

  title: string;
  meta: Array<{ name: string; content: string }>;

  request?: Express.Request;
};

export const DocumentContext = createContext<DocumentContextData | null>(null);
export const useDocument = () => {
  const context = useContext(DocumentContext);
  if (!context) {
    throw new Error("useDocument must be used within a DocumentProvider");
  }
  return context;
};

export type DocumentProviderProps = {
  children: React.ReactNode;
  value: DocumentContextData;
};

export const DocumentProvider = ({
  children,
  value,
}: DocumentProviderProps) => {
  return (
    <DocumentContext.Provider value={value}>
      {children}
    </DocumentContext.Provider>
  );
};
