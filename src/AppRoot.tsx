import pages from "virtual:xanix-pages";
import Document from "virtual:xanix-document";
import { useState, useEffect } from "react";
import { DocumentProvider } from "./components/DocumentContext";
import xanix from "./server/index.js";

export type AppRootProps = {
  Component: any;
  doc: any;
};

const AppRoot = ({ Component, doc }: AppRootProps) => {
  const [_document, setDocument] = useState(doc);

  useEffect(() => {
    xanix.on("navigate:end", setDocument);
  }, []);

  const ComponentToRender = pages[_document.page.id] || Component;

  return (
    <DocumentProvider value={_document}>
      <Document>
        <ComponentToRender />
      </Document>
    </DocumentProvider>
  );
};

export default AppRoot;
