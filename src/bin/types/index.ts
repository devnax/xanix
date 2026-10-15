import type { Router, RequestHandler, Request, Response } from "express";
import type { ComponentType, ReactNode } from "react";
import { Engine } from "../../bin/libs/scanFileRoutes";
import { Metadata } from "./metadata";

type Layout = {
  default: ComponentType<{
    req?: Request;
    res?: Response;
    children: ReactNode;
  }>;
};

type Page = {
  metadata?: Metadata;
  getProps?: (req: Request, res: Response) => Promise<Record<string, any>>;
  default: ComponentType<{
    req?: Request;
    res?: Response;
    children: ReactNode;
    [key: string]: any;
  }>;
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
  props?: () => Promise<Record<string, any>>;
  layouts?: Array<() => Promise<Layout>>;
}
