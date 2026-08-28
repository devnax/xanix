import { DocumentContext, type XanixDocumentData } from "./context.js";
import { HTMLProps } from "react";

export type DocumentProps = HTMLProps<HTMLHtmlElement> & {
  document: XanixDocumentData;
  children: React.ReactNode;
};

const Document = ({ document, children, ...props }: DocumentProps) => {
  return (
    <DocumentContext.Provider value={document}>
      <html {...props}>{children}</html>
    </DocumentContext.Provider>
  );
};

export default Document;
