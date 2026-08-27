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
