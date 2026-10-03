type CacheEntry = {
  value: unknown;
  expiry: number;
};
export const XanixCache = new Map<string, CacheEntry>();

export type CacheOption = {
  ttl?: number;
  mode?: "server" | "client";
};

const cache = <T>(cb: Function, options?: CacheOption, id?: string) => {
  const key = id!;
  if (!options || !options.ttl) return cb;

  if (__XANIX_SERVER__) {
    if (options?.mode !== "server") {
      return cb;
    }
  }

  if (__XANIX_CLIENT__) {
    if (options?.mode !== "client") {
      return cb;
    }
  }

  return (...args: unknown[]): T => {
    const now = Date.now();
    const entry = XanixCache.get(key);

    if (entry) {
      if (now < entry.expiry) {
        return entry.value as T;
      }
      XanixCache.delete(key);
    }

    const value = cb(...args);
    XanixCache.set(key, {
      value,
      expiry: Date.now() + (options?.ttl ?? 0),
    });

    return value as T;
  };
};

export default cache;
