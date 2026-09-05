import { useState } from "react";
import usePage from "../usePage.js";
import UseServerRegistry from "./state.js";
import registry from "./registry.js";
import outdirs from "../../outdirs.js";

type UseServerCallback<T = any> = (args: Record<string, any>) => Promise<T>;
type UseServerResult<T = any> = {
  data: T;
  loading: boolean;
  reload: () => Promise<void>;
};

let useServer: <T = any>(
  callback: UseServerCallback<T>,
  args?: Record<string, any>,
) => Promise<UseServerResult<T>>;

if (__XANIX_SERVER__) {
  const useInServer = async <T = any>(
    args: Record<string, any>,
  ): Promise<UseServerResult<T>> => {
    const uid = args.uid;
    const callback = registry.get(uid);
    if (typeof callback !== "function") {
      throw new Error("useServer() on the server requires a callback.");
    }
    const page = usePage();
    const data = await callback(args);
    UseServerRegistry.setData(page.pageId, uid, data);

    return { data, loading: false, reload: async () => {} };
  };
  useServer = useInServer as any;
} else {
  const useInClient = <T = any>({
    uid,
    ...args
  }: Record<string, any>): UseServerResult<T> => {
    const [data, setData] = useState<T>(() => {
      const winData = (window as any).__USE_SERVER_DATA__?.[uid];
      return winData ?? null;
    });

    const [loading, setLoading] = useState(!data);
    const reload = async () => {
      setLoading(true);
      const res = await fetch(`/${outdirs.root}/__server_data__/${uid}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(args ?? {}),
      });
      try {
        const result = await res.json();
        setData(result.data);
      } catch (error) {
        console.error(error);
      }
      setLoading(false);
    };
    return {
      data,
      loading,
      reload,
    };
  };
  useServer = useInClient as any;
}

export const registerUseServer = (uid: string, callback: UseServerCallback) => {
  registry.set(uid, callback);
};

export default useServer;
