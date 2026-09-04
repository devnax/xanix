import { useRef, useSyncExternalStore } from "react";

import useResponse from "./useResponse.js";
import useHeaders from "./useHeaders.js";

export type CookieOptions = {
  maxAge?: number;
  expires?: Date;
  domain?: string;
  path?: string;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: "strict" | "lax" | "none";
};

type CookiesStore = {
  subscribe: (callback: () => void) => () => void;

  getSnapshot: () => string;
  getServerSnapshot: () => string;
  emit: () => void;
};

const createCookiesStore = (serverCookies?: string): CookiesStore => {
  const handlers = new Set<() => void>();
  const subscribe = (callback: () => void) => {
    handlers.add(callback);
    return () => {
      handlers.delete(callback);
    };
  };

  const getSnapshot = () => {
    if (__XANIX_SERVER__) {
      return serverCookies ?? "";
    } else {
      return document.cookie;
    }
  };

  const getServerSnapshot = () => serverCookies ?? "";

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

const parseCookies = (cookies: string): Record<string, string> => {
  if (!cookies) {
    return {};
  }

  return cookies.split(";").reduce(
    (result, cookie) => {
      const index = cookie.indexOf("=");

      if (index === -1) {
        return result;
      }

      const name = cookie.slice(0, index).trim();
      const value = cookie.slice(index + 1).trim();
      if (!name) {
        return result;
      }

      try {
        result[name] = decodeURIComponent(value);
      } catch {
        result[name] = value;
      }

      return result;
    },
    {} as Record<string, string>,
  );
};

const serializeCookie = (
  name: string,
  value: string,
  options: CookieOptions = {},
) => {
  let cookie = `${encodeURIComponent(name)}=` + `${encodeURIComponent(value)}`;

  if (options.maxAge !== undefined) {
    cookie += `; Max-Age=${Math.floor(options.maxAge)}`;
  }

  if (options.expires) {
    cookie += `; Expires=${options.expires.toUTCString()}`;
  }

  if (options.domain) {
    cookie += `; Domain=${options.domain}`;
  }

  cookie += `; Path=${options.path ?? "/"}`;

  if (options.secure) {
    cookie += "; Secure";
  }

  if (options.httpOnly) {
    cookie += "; HttpOnly";
  }

  if (options.sameSite) {
    cookie += `; SameSite=${options.sameSite}`;
  }

  return cookie;
};

const useCookies = () => {
  const headers = useHeaders();
  const res = useResponse();
  const storeRef = useRef<CookiesStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = createCookiesStore(headers?.cookie);
  }

  const store = storeRef.current;
  const cookies = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );

  const parsed = parseCookies(cookies);

  const set = (name: string, value: string, options: CookieOptions = {}) => {
    const cookie = serializeCookie(name, value, options);
    if (__XANIX_SERVER__) {
      res?.append?.("Set-Cookie", cookie);
    } else {
      document.cookie = cookie;
      store.emit();
    }
  };

  const remove = (
    name: string,
    options: Omit<CookieOptions, "maxAge" | "expires"> = {},
  ) => {
    const cookie = serializeCookie(name, "", {
      ...options,
      maxAge: 0,
    });

    if (__XANIX_SERVER__) {
      res?.append?.("Set-Cookie", cookie);
      return;
    }

    document.cookie = cookie;
    store.emit();
  };

  return {
    get: (name: string): string | null => parsed[name] ?? null,
    getAll: (): Record<string, string> => parsed,
    has: (name: string): boolean => name in parsed,
    set,
    remove,
  };
};

export default useCookies;
