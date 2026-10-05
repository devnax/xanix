import { Request, Response } from "express";
import { DocumentContextData } from "../components/DocumentContext";

export interface EventMap {
  "navigate:start": { path: string; request?: Request; response?: Response };
  "navigate:end": DocumentContextData;
  "navigation:error": {
    error: Error;
    path: string;
    request?: Request;
    response?: Response;
  };
  "preload:start": { path: string };
  "preload:end": DocumentContextData;

  // page-related events
  "page:before-render": DocumentContextData;
  "page:after-render": DocumentContextData;

  // action
  "action:start": {
    args: Record<string, any>;
    id: string;
    request?: Request;
    response?: Response;
  };
  "action:end": {
    args: Record<string, any>;
    id: string;
    request?: Request;
    response?: Response;
  };
  "action:error": {
    error: Error;
    args: Record<string, any>;
    id: string;
    request?: Request;
    response?: Response;
  };

  // upload
  "upload:start": {
    file: File;
    request?: Request;
    response?: Response;
  };
  "upload:end": {
    file: File;
    id: string;
    request?: Request;
    response?: Response;
  };
}
