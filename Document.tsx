import { Document, Head, Body, type DocumentProps } from "./src/index.js";

if (!__XANIX_CLIENT__) {
  console.log("Window loaded on the server side");
}

const RootDocument = ({ document, children }: DocumentProps) => {
  return (
    <Document document={document}>
      <Head></Head>
      <Body>{children}</Body>
    </Document>
  );
};

export default RootDocument;
