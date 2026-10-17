declare module "virtual:react-refresh" {}

declare module "virtual:xanix-route" {
  import type { Request, RequestHandler, Response } from "express";
  import type { Router } from "express";
  import type { Engine } from "../engine";
  import { Metadata } from "../metadata";

  export type RenderContext = {
    route: XanixRoute;
    req?: Request;
    res?: Response;

    // client
    mode?: "hydration" | "navigation";
    current?: XanixRoute | null;
  };

  export type RenderContextServer = {
    route: XanixRoute;
    req: Request;
    res: Response;
  };

  export type Renderer = {
    render: (ctx: RenderContext) => Promise<void>;
    onExit: (route: XanixRoute) => Promise<void>;
  };

  export interface XanixRoute {
    engine: Engine;
    path: string;
    renderer: () => Promise<Renderer>;
    route?: {
      ROUTER?: Router;
      GET?: RequestHandler;
      POST?: RequestHandler;
      PUT?: RequestHandler;
      DELETE?: RequestHandler;
      PATCH?: RequestHandler;
      OPTIONS?: RequestHandler;
      HEAD?: RequestHandler;
    };

    middleware?: {
      default?: RequestHandler;
    };

    page?: string | (() => Promise<Page>);
    props?: () => Promise<Record<string, any>>;
    layouts?: Array<string> | Array<() => Promise<Layout>>;
  }
  const routes: XanixRoute[];
  export default routes;
}

declare module "virtual:xanix-pages" {
  import type { LazyExoticComponent, ComponentType } from "react";
  const pages: Record<string, () => Promise<any>>;
  export default pages;
}

declare module "virtual:xanix-document" {
  import type { ComponentType, ReactNode } from "react";
  import type { Request, RequestHandler, Response } from "express";

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
