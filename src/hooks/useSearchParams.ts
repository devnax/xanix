import { navigate } from "../navigate.js";
import { useEffect, useState } from "react";
import useDocument from "./useDocument.js";

const getParams = (req: any) => {
  return new URLSearchParams(
    __XANIX_SERVER__ ? req.url.split("?")[1] || "" : window.location.search,
  );
};

const buildUrl = (params: URLSearchParams) => {
  const search = params.toString();
  return (
    window.location.pathname +
    (search ? `?${search}` : "") +
    window.location.hash
  );
};

const useSearchParams = () => {
  const { request }: any = useDocument();

  const update = (newParams: URLSearchParams) => {
    navigate(buildUrl(newParams));
  };

  return {
    get: (key: string) => getParams(request).get(key),
    getAll: () => {
      const p: any = {};
      for (const [key, value] of getParams(request).entries()) {
        if (!p[key]) {
          p[key] = [];
        }
        p[key].push(value);
      }
      return p;
    },
    has: (key: string) => getParams(request).has(key),
    set: (key: string, value: string | undefined) => {
      const newParams = new URLSearchParams(getParams(request));
      if (!value) {
        newParams.delete(key);
        update(newParams);
      } else if (!newParams.has(key)) {
        newParams.set(key, value);
        update(newParams);
      }
    },
    sets: (entries: Record<string, string>) => {
      const newParams = new URLSearchParams(getParams(request));
      for (const [key, value] of Object.entries(entries)) {
        newParams.set(key, value);
      }
      update(newParams);
    },
    delete: (key: string) => {
      const newParams = new URLSearchParams(getParams(request));
      newParams.delete(key);
      update(newParams);
    },
    deletes: (keys: string[]) => {
      const newParams = new URLSearchParams(getParams(request));
      for (const key of keys) {
        newParams.delete(key);
      }
      update(newParams);
    },
    clear: () => {
      update(new URLSearchParams());
    },
    toString: () => getParams(request).toString(),
  };
};

export default useSearchParams;
