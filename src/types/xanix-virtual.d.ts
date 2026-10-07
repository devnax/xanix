declare module "virtual:xanix-document" {
  import type { ComponentType, ReactNode } from "react";
  import type { Request, Response } from "express";

  export type XanixDocumentProps = {
    children?: ReactNode;
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
