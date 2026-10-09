import { useRef, useState, useEffect } from "react";
import useRequest from "./useRequest.js";
import useResponse from "./useResponse.js";
import type { CacheOption } from "./cache.js";
import { Request, Response } from "express";
import server from "./server.js";

type Context = {
  request: Request;
  response: Response;
};

type Callback<T = any> = (
  args: Record<string, any>,
  ctx?: Context,
) => Promise<T>;
type ResourceEntry = {
  promise: Promise<unknown>;
  status: "pending" | "success" | "error";
  value?: unknown;
  error?: unknown;
};

export const UseServerResource = new Map<string, ResourceEntry>();
export const UseServerResult = new Map<string, unknown>();

const useServerOnServer = <T = any>(
  callback: Function,
  args: Record<string, any> = {},
  id: string,
) => {
  if (__XANIX_SERVER__) {
    let entry = UseServerResource.get(id);
    const req = useRequest();
    const res = useResponse();
    if (!entry) {
      const promise = callback(args, {
        request: req,
        response: res,
      });

      entry = {
        promise,
        status: "pending",
        value: undefined,
        error: undefined,
      };

      UseServerResource.set(id, entry as any);

      promise.then(
        (value: any) => {
          (entry as any).status = "success";
          (entry as any).value = value;
        },
        (error: any) => {
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
  }
};
const useServer = <T = any>(
  callback: Callback<T>,
  args: Record<string, any> = {},
  option?: CacheOption,
) => {
  const id = (callback as any).id;
  if (__XANIX_SERVER__) {
    const value = useServerOnServer(callback, args, id!);
    UseServerResult.set(id!, value);
    return {
      data: value,
      loading: false,
      reload: async () => {},
    };
  } else {
    const init = useRef(false);
    const first = useRef(true);
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState(() => {
      const d = UseServerResult.get(id!);
      UseServerResult.delete(id!);
      return d;
    });

    const reload = async () => {
      setLoading(true);
      const res = await callback(args);
      setData(res);
      setLoading(false);
    };

    useEffect(() => {
      if (!first.current) {
        return;
      }
      first.current = false;
    }, []);
    useEffect(() => {
      if (!first.current) {
        return;
      }
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
useServer.server = server;
export default useServer;
