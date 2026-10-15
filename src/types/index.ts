import type { Router, RequestHandler, Request, Response } from "express";
import type { ComponentType, ReactNode } from "react";
import { Metadata } from "./metadata";
import { Engine } from "../include/code/scanFileRoutes";

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

  page?: string | (() => Promise<Page>);
  props?: () => Promise<Record<string, any>>;
  layouts?: Array<string> | Array<() => Promise<Layout>>;
}
