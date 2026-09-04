import { useRef, useSyncExternalStore } from "react";

import { navigate } from "../navigate.js";
import useDocument from "./useDocument.js";

type Request = {
  url?: string;
};

type SearchParamsStore = {
  subscribe: (callback: () => void) => () => void;
  getSnapshot: () => string;
  getServerSnapshot: () => string;
  emit: () => void;
};

const getServerSearch = (request?: Request): string => {
  if (!request?.url) {
    return "";
  }
  const query = request.url.split("?")[1] || "";
  return query.split("#")[0];
};

const createSearchParamsStore = (request?: Request): SearchParamsStore => {
  const handlers = new Set<() => void>();
  const subscribe = (callback: () => void) => {
    handlers.add(callback);
    return () => {
      handlers.delete(callback);
    };
  };

  const getSnapshot = () => {
    if (__XANIX_SERVER__) {
      return getServerSearch(request);
    }
    return window.location.search.slice(1);
  };

  const getServerSnapshot = () => {
    return getServerSearch(request);
  };

  const emit = () => {
    for (const handler of handlers) {
      handler();
    }
  };

  return {
    subscribe,
    getSnapshot,
    getServerSnapshot,
    emit,
  };
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

const useSearchParams = () => {
  const { request }: { request?: Request } = useDocument();

  /**
   * The store must remain stable between renders.
   *
   * Creating this directly inside the component would create
   * a new subscribe/getSnapshot implementation on every render.
   */
  const storeRef = useRef<SearchParamsStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = createSearchParamsStore(request);
  }

  const store = storeRef.current;
  const search = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );

  /**
   * URLSearchParams is recreated from the stable string snapshot.
   * This object itself does not need to be stable.
   */
  const params = new URLSearchParams(search);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const update = (newParams: URLSearchParams) => {
    if (__XANIX_SERVER__) {
      return;
    }

    const newSearch = newParams.toString();
    const currentSearch = window.location.search.slice(1);

    /**
     * Nothing changed.
     */
    if (currentSearch === newSearch) {
      return;
    }

    /**
     * Update the browser URL first.
     *
     * replaceState does NOT trigger popstate, so we explicitly
     * notify useSyncExternalStore afterwards.
     */
    window.history.replaceState(window.history.state, "", buildUrl(newSearch));

    /**
     * Now the snapshot returned by getSnapshot() has changed.
     */
    store.emit();

    /**
     * Cancel previous navigation.
     */
    if (timer.current !== null) {
      clearTimeout(timer.current);
    }

    /**
     * Debounce the actual Xanix navigation.
     */
    timer.current = setTimeout(() => {
      timer.current = null;
      navigate(buildUrl(newSearch));
    }, 300);
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
