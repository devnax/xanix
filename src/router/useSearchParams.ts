import { navigate } from "../navigation/navigate.js";
import { useEffect, useState } from "react";
import useDocument from "../document/useDocument.js";

const getParams = () => {
  return new URLSearchParams(window.location.search);
};

const buildUrl = (params: URLSearchParams) => {
  const search = params.toString();
  return (
    window.location.pathname +
    (search ? `?${search}` : "") +
    window.location.hash
  );
};

export const useSearchParams = () => {
  const { request } = useDocument();
  let _params;
  if (request) {
    _params = new URLSearchParams(request.url.split("?")[1] || "");
  } else {
    _params = getParams();
  }
  const [params, setParams] = useState(_params);

  useEffect(() => {
    const onNavigate = () => {
      setParams(getParams());
    };

    window.addEventListener("xanix:navigate:end", onNavigate);
    window.addEventListener("popstate", onNavigate);

    return () => {
      window.removeEventListener("xanix:navigate:end", onNavigate);
      window.removeEventListener("popstate", onNavigate);
    };
  }, []);

  const update = (newParams: URLSearchParams) => {
    setParams(newParams);
    navigate(buildUrl(newParams));
  };

  return {
    get: (key: string) => params.get(key),
    getAll: () => {
      const p: any = {};
      for (const [key, value] of params.entries()) {
        if (!p[key]) {
          p[key] = [];
        }
        p[key].push(value);
      }
      return p;
    },
    has: (key: string) => params.has(key),
    set: (key: string, value: string) => {
      const newParams = new URLSearchParams(params);
      newParams.set(key, value);
      update(newParams);
    },
    sets: (entries: Record<string, string>) => {
      const newParams = new URLSearchParams(params);
      for (const [key, value] of Object.entries(entries)) {
        newParams.set(key, value);
      }
      update(newParams);
    },
    delete: (key: string) => {
      const newParams = new URLSearchParams(params);
      newParams.delete(key);
      update(newParams);
    },
    deletes: (keys: string[]) => {
      const newParams = new URLSearchParams(params);
      for (const key of keys) {
        newParams.delete(key);
      }
      update(newParams);
    },
    clear: () => {
      update(new URLSearchParams());
    },
    toString: () => params.toString(),
  };
};
