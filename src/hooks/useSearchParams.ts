import { useRef } from "react";
import { navigate } from "../navigate.js";
import useDocument from "./useDocument.js";
import { createStore, useStore } from "./useStore.js";
import useRequest from "./useRequest.js";

type Request = {
  url?: string;
};

const buildUrl = (search: string) => {
  if (__XANIX_SERVER__) {
    return search ? `?${search}` : "";
  }

  return (
    window.location.pathname +
    (search ? `?${search}` : "") +
    window.location.hash
  );
};

const Store = createStore({
  search: "",
});

const useSearchParams = () => {
  const request = useRequest();
  const store = useStore(Store);
  let search = "";
  if (__XANIX_CLIENT__) {
    search = window.location.search.slice(1);
  } else {
    const query = request!.url.split("?")[1] || "";
    search = search || query.split("#")[0];
  }

  const params = new URLSearchParams(search);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const update = (newParams: URLSearchParams) => {
    if (__XANIX_CLIENT__) {
      const newSearch = newParams.toString();
      const currentSearch = window.location.search.slice(1);

      if (currentSearch === newSearch) {
        return;
      }

      window.history.replaceState(
        window.history.state,
        "",
        buildUrl(newSearch),
      );

      store.emit();

      if (timer.current !== null) {
        clearTimeout(timer.current);
      }

      timer.current = setTimeout(() => {
        timer.current = null;
        navigate(buildUrl(newSearch));
      }, 300);
    }
  };

  return {
    /**
     * Get first value.
     */
    get: (key: string): string | null => {
      return params.get(key);
    },

    /**
     * Get all values grouped by key.
     *
     * ?tag=react&tag=xanix
     *
     * becomes:
     *
     * {
     *   tag: ["react", "xanix"]
     * }
     */
    getAll: (): Record<string, string[]> => {
      const result: Record<string, string[]> = {};

      for (const [key, value] of params.entries()) {
        if (!result[key]) {
          result[key] = [];
        }
        result[key].push(value);
      }

      return result;
    },

    /**
     * Check whether a key exists.
     */
    has: (key: string): boolean => {
      return params.has(key);
    },

    /**
     * Set one value.
     *
     * set("page", "2")
     *
     * Passing undefined deletes the key.
     */
    set: (key: string, value: string | undefined) => {
      const newParams = new URLSearchParams(params);

      if (value === undefined) {
        newParams.delete(key);
      } else {
        newParams.set(key, value);
      }

      update(newParams);
    },

    /**
     * Set multiple values.
     */
    sets: (entries: Record<string, string>) => {
      const newParams = new URLSearchParams(params);

      for (const [key, value] of Object.entries(entries)) {
        newParams.set(key, value);
      }

      update(newParams);
    },

    /**
     * Delete one key.
     */
    delete: (key: string) => {
      const newParams = new URLSearchParams(params);
      newParams.delete(key);
      update(newParams);
    },

    /**
     * Delete multiple keys.
     */
    deletes: (keys: string[]) => {
      const newParams = new URLSearchParams(params);
      for (const key of keys) {
        newParams.delete(key);
      }
      update(newParams);
    },

    /**
     * Remove all search parameters.
     */
    clear: () => {
      update(new URLSearchParams());
    },

    /**
     * Return the current query string without ?.
     */
    toString: () => {
      return params.toString();
    },
  };
};

export default useSearchParams;
