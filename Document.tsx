import { Head, Body, Document, type DocumentProps } from "xanix";

const BaseDocument = ({ document, children }: DocumentProps) => {
  return (
    <Document document={document}>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>
      <Body>{children}</Body>
    </Document>
  );
};

export default BaseDocument;
