declare module "virtual:xanix-document" {
  import type { ComponentType, ReactNode } from "react";
  import type { Request } from "express";

  export type XanixDocumentData = {
    pageId: string;
    props: Record<string, any>;
    title: string;
    meta: Array<{
      name: string;
      content: string;
    }>;
    params: Record<string, string>;
    request?: Request;
    pageData: Record<string, any>;
  };

  export type XanixDocumentProps = {
    document: XanixDocumentData;
    children?: ReactNode;
  };

  const Document: ComponentType<XanixDocumentProps>;

  export default Document;
}
