declare module "virtual:xanix-document" {
  import type { ComponentType, ReactNode } from "react";
  import type { Request, Response } from "express";

  export type XanixDocumentData = {
    pageId: string;
    props: Record<string, any>;
    params: Record<string, string>;
    path: string;
    metadata: Record<string, any>;
    request?: Request;
    response?: Response;
    usedata: Record<string, any>;
  };

  export type XanixDocumentProps = {
    document: XanixDocumentData;
    children?: ReactNode;
    page: {
      id: string;
      props: Record<string, any>;
    };
    metadata: Record<string, any>;
    request?: Request;
    response?: Response;
  };

  /**
   * User-defined document component.
   */
  const Document: ComponentType<XanixDocumentProps>;

  /**
   * Generates document metadata for the current request.
   */
  export const metadata: (
    request: Request,
    context: { pageId: string; name: string },
  ) => Promise<Record<string, any>>;

  export default Document;
}
