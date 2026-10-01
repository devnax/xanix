import { DocumentContextData, DocumentProvider } from "./DocumentContext.js";

export type DocumentProps = {
  children?: React.ReactNode;
  // document: DocumentContextData;
};

const Document = ({ children /*, document */ }: DocumentProps) => {
  if (__XANIX_CLIENT__) {
    return children;
  } else {
    return <html>{children}</html>;
  }
};

export default Document;
