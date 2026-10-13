import { createContext } from "react";
import type { Request, Response } from "express";
import useDocument from "../hooks/useDocument.js";
import outdirs from "../outdirs.js";
import { XanixAssets } from "../server/index.js";

import Document from "virtual:xanix-document";

export type DocumentContextData = {
  page: {
    id: string;
    props: Record<string, any>;
  };
  metadata: Record<string, any>;
  params: Record<string, string>;
  path: string;
  request?: Request;
  response?: Response;
  pagedata: Record<string, any>;
};

export const DocumentContext = createContext<DocumentContextData | null>(null);

export type DocumentProviderProps = {
  children: React.ReactNode;
  value: DocumentContextData;
};

export const DocumentProvider = ({
  children,
  value,
}: DocumentProviderProps) => {
  const { page, params, path, metadata, pagedata } = value;
  let devScript = __XANIX_DEV__
    ? `window.$RefreshReg$ = (type, id) => {};window.$RefreshSig$ = () => (type) => type;`
    : "";
  return (
    <DocumentContext.Provider value={value}>
      {Array.from(XanixAssets.values())
        .filter((asset) => asset.type === "css")
        .map((asset) => (
          <link
            key={asset.path}
            rel="stylesheet"
            href={`assets/${asset.name}`}
          />
        ))}
      {children}
      <script
        dangerouslySetInnerHTML={{
          __html: `${devScript}; window.__XDOCUMENT = ${JSON.stringify({
            page: {
              id: page.id,
              props: page.props,
            },
            params,
            path,
            metadata,
            pagedata,
          })}; 
        `,
        }}
      ></script>
    </DocumentContext.Provider>
  );
};
