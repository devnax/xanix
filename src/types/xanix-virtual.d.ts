declare module "virtual:xanix-route" {
  import { XanixRoute } from "../servers/type";
  const pages: XanixRoute[];
  export default pages;
}

declare module "virtual:xanix-pages" {
  import type { LazyExoticComponent, ComponentType } from "react";
  const pages: Record<string, () => Promise<any>>;
  export default pages;
}

declare module "virtual:xanix-document" {
  import type { ComponentType, ReactNode } from "react";
  import type { Request, Response } from "express";

  export type XanixDocumentProps = {
    children?: ReactNode;
    document: {
      request?: Request;
      response?: Response;
      page: {
        id: string;
        props: Record<string, any>;
      };
      metadata: Record<string, any>;
      params: Record<string, any>;
      pagedata: Record<string, any>;
    };
  };

  /**
   * User-defined document component.
   */
  const Document: ComponentType<XanixDocumentProps>;

  /**
   * Generates document metadata for the current request.
   */
  export const metadata: (context: {
    request: Request;
    response: Response;
    page: {
      id: string;
      props: Record<string, any>;
    };
  }) => Promise<Record<string, any>>;

  export default Document;
}

declare module "virtual:xanix-dev" {}
