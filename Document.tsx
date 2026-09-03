import { Head, Body, Document, type XanixDocumentProps } from "xanix";
import type { Request } from "express";

export const metadata = async (
  request: Request,
  context: { id: string; name: string },
) => {
  return {
    title: "My App",
    description: "This is my app",
  };
};

const RootDocument = ({ document, children }: XanixDocumentProps) => {
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

export default RootDocument;
