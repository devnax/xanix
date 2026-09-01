import { DocumentContextData, DocumentProvider } from "./DocumentContext.js";

export type DocumentProps = {
  children?: React.ReactNode;
  document: DocumentContextData;
};

const Document = ({ children, document }: DocumentProps) => {
  if (__XANIX_CLIENT__) {
    return <DocumentProvider value={document}>{children}</DocumentProvider>;
  } else {
    return (
      <DocumentProvider value={document}>
        <html>{children}</html>
      </DocumentProvider>
    );
  }
};

export default Document;
