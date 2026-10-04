import { useRef, useState, useEffect } from "react";
import type { CacheOption } from "./cache.js";

type Callback<T = any> = (args: Record<string, any>) => Promise<T>;
type ResourceEntry = {
  promise: Promise<unknown>;
  status: "pending" | "success" | "error";
  value?: unknown;
  error?: unknown;
};

export const UseServerResource = new Map<string, ResourceEntry>();
export const UseServerResult = new Map<string, unknown>();

const useServerOnServer = <T = any>(
  callback: Callback<T>,
  args: Record<string, any> = {},
  id: string,
) => {
  if (__XANIX_SERVER__) {
    let entry = UseServerResource.get(id);

    if (!entry) {
      const promise = callback(args);

      entry = {
        promise,
        status: "pending",
        value: undefined,
        error: undefined,
      };

      UseServerResource.set(id, entry as any);

      promise.then(
        (value) => {
          (entry as any).status = "success";
          (entry as any).value = value;
        },
        (error) => {
          (entry as any).status = "error";
          (entry as any).error = error;
        },
      );
    }

    if (entry.status === "pending") {
      throw entry.promise;
    }

    if (entry.status === "error") {
      throw entry.error;
    }

    return entry.value as T;
  } else {
  }
};

const useServer = <T = any>(
  callback: Callback<T>,
  args: Record<string, any> = {},
  option?: CacheOption,
  id?: string,
) => {
  if (__XANIX_SERVER__) {
    const res = useServerOnServer(callback, args, id!);
    UseServerResult.set(id!, res);
    return {
      data: res,
      loading: false,
      reload: async () => {},
    };
  } else {
    const init = useRef(false);
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState(UseServerResult.get(id!));

    const reload = async () => {
      setLoading(true);
      const res = await callback(args);
      setData(res);
      setLoading(false);
    };

    useEffect(() => {
      if (init.current) {
        reload();
      } else {
        init.current = true;
      }
    }, [JSON.stringify(args)]);

    return {
      data,
      loading,
      reload,
    };
  }
};

export default useServer;
