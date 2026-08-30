import { DocumentContextData, DocumentProvider } from "./DocumentContext.js";

export type DocumentProps = {
  children?: React.ReactNode;
  document: DocumentContextData;
};

const Document = ({ children, document }: DocumentProps) => {
  const isClient = typeof window !== "undefined";
  if (isClient) {
    return <DocumentProvider value={document}>{children}</DocumentProvider>;
  }
  return (
    <DocumentProvider value={document}>
      <html>{children}</html>
    </DocumentProvider>
  );
};

export default Document;
