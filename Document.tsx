import { Document, Head, Body, type DocumentProps } from "./src/index.js";

const RootDocument = ({ document, children }: DocumentProps) => {
  return (
    <Document document={document}>
      <Head></Head>
      <Body>{children}</Body>
    </Document>
  );
};

export default RootDocument;
