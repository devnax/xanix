import { createContext } from "react";
import type { Request, Response } from "express";
export type DocumentContextData = {
  pageId: string;
  props: Record<string, any>;
  metadata: Record<string, any>;
  params: Record<string, string>;
  request?: Request;
  response?: Response;
  usedata: Record<string, any>;
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
