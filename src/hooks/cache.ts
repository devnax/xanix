type CacheEntry = {
  value: unknown;
  expiry: number;
  args: unknown[];
};
export const XanixCache = new Map<string, CacheEntry>();

type ValidateArg = {
  entry: CacheEntry;
  args: unknown[];
  id: string;
};

export type CacheOption = {
  ttl?: number;
  mode?: "server" | "client";
  validate?: (arg: ValidateArg) => boolean;
};

const cache = <T>(cb: Function, options?: CacheOption, id?: string) => {
  if (!options || !options.ttl) return cb;
  if (__XANIX_SERVER__) {
    if (options?.mode && options?.mode !== "server") {
      return cb;
    }
  }

  if (__XANIX_CLIENT__) {
    if (options?.mode && options?.mode !== "client") {
      return cb;
    }
  }

  const cachedFunction = (...args: unknown[]): T => {
    const key = id!;
    const entry = XanixCache.get(key);

    if (entry) {
      let has = true;
      const validateArg: ValidateArg = {
        entry,
        id: id!,
        args,
      };
      if (options?.validate && !options.validate(validateArg)) {
        XanixCache.delete(key);
        has = false;
      }

      if (has) {
        const now = Date.now();
        if (now < entry.expiry) {
          return entry.value as T;
        }
        XanixCache.delete(key);
      }
    }

    const value = cb(...args);
    XanixCache.set(key, {
      value,
      expiry: Date.now() + options.ttl!,
      args,
    });

    return value as T;
  };
  return cachedFunction;
};

export default cache;
