import type { Router, RequestHandler, Request, Response } from "express";
import type { ComponentType, ReactNode } from "react";
import { Engine } from "../../bin/libs/scanFileRoutes";

type LayoutProps = {
  req?: Request;
  res?: Response;
  children: ReactNode;
};

type Layout = {
  default: ComponentType<LayoutProps>;
};

type PageProps = {
  req?: Request;
  res?: Response;
  children: ReactNode;
};

type Page = {
  metadata?: {
    title?: string;
    description?: string;
    keywords?: string[];
    author?: string;
    robots?: string;
    charset?: string;
    viewport?: string;
    themeColor?: string;
    favicon?: string;
  };

  getProps?: (context: {
    req?: Request;
    res?: Response;
  }) => Promise<Record<string, any>>;

  default: ComponentType<PageProps>;
};

export interface XanixRoute {
  engine: Engine;
  path: string;
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

  page?: () => Promise<Page>;
  layouts?: Array<() => Promise<Layout>>;
}
