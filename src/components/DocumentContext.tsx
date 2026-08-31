import { createContext } from "react";
import type { Request } from "express";
export type DocumentContextData = {
  pageId: string;
  props: Record<string, any>;

  title: string;
  meta: Array<{ name: string; content: string }>;
  params: Record<string, string>;
  request?: Request;
  pageData: Record<string, any>;
};

export const DocumentContext = createContext<DocumentContextData | null>(null);

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
