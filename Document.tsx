import { Head, Body, Document, type XanixDocumentProps } from "xanix";
import type { Request } from "express";
import { ThemeProvider, createTheme } from "@xanui/core";

export const metadata = async (
  request: Request,
  context: { id: string; name: string },
) => {
  return {
    title: "My App",
    description: "This is my app",
  };
};

const RootDocument = ({ children }: XanixDocumentProps) => {
  return (
    <Document>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>
      <Body style={{ margin: 0, padding: 0 }}>
        <ThemeProvider theme={createTheme({ name: "dark", mode: "dark" })}>
          {children}
        </ThemeProvider>
      </Body>
    </Document>
  );
};

export default RootDocument;
