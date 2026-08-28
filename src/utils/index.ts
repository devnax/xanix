import { ReactNode } from "react";

export const getGlobal = () => {
  if (typeof window === "undefined") {
    return globalThis as any;
  } else {
    return window as any;
  }
};

export const getGlobalXanix = (): Record<string, any> => {
  const global = getGlobal();
  global.Xanix = global.Xanix || {};
  return global.Xanix;
};

export type DocumentData = {
  head: ReactNode;
  body: ReactNode;
};
export const getDocumentData = (): DocumentData => {
  const global = getGlobal();
  global.DocumentData = global.DocumentData || {};
  return global.DocumentData;
};

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const getDocumentFile = async () => {
  const documentEntry = path.join(process.cwd(), ".xanix", "xanix-document.js");
  if (fs.existsSync(documentEntry)) {
    return documentEntry;
  }
  throw new Error(`Document file not found at ${documentEntry}`);
};
