import { useEffect, useRef, useState } from "react";
import usePage from "../usePage.js";
import outdirs from "../../outdirs.js";
import {
  getServerResource,
  ServerRegistry,
  ServerResources,
  UseServerCallback,
} from "./core.js";

export type UseServerArgs = {
  uid: string;
  args?: Record<string, any>;
};

export type UseServerReturn<T = any> = {
  data: T | null;
  reload: () => Promise<void>;
  loading: boolean;
};

export const registerUseServer = (
  uid: string,
  callback: UseServerCallback,
): void => {
  ServerRegistry.set(uid, callback);
};

function useServerOnServer<T = any>({
  uid,
  args = {},
}: UseServerArgs): UseServerReturn<T> {
  const page = usePage();
  const resource = getServerResource<T>(page.pageId, uid, args);
  return {
    data: resource.read(),
    reload: async () => {},
    loading: false,
  };
}

function useServerOnClient<T = any>({
  uid,
  args = {},
}: UseServerArgs): UseServerReturn<T> {
  const initialData = (window as any).__USE_SERVER_DATA__?.[uid];
  const page = usePage();
  const [data, setData] = useState<T>(initialData);
  const [loading, setLoading] = useState(!initialData);
  const init = useRef(false);
  const body = JSON.stringify(args);

  const reload = async (): Promise<void> => {
    setLoading(true);
    const response = await fetch(
      `/${outdirs.root}/__server_data__/${page.pageId}/${uid}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body,
      },
    );

    try {
      const result = await response.json();
      setData(result.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (data === undefined && !init.current) {
      reload();
    } else if (init.current) {
      reload();
    }
    init.current = true;
  }, [body]);

  return { data, reload, loading };
}

type Args = {
  cache?:
    | boolean
    | {
        ttl?: number; // time to live in milliseconds for the cache
      };

  [key: string]: any;
};

let useServer: <T = any>(
  callback: UseServerCallback,
  args?: Args,
) => UseServerReturn<T>;

if (__XANIX_SERVER__) {
  useServer = useServerOnServer as any;
} else {
  useServer = useServerOnClient as any;
}

export const getUseServerData = (pageId: string): Record<string, any> => {
  const resources = ServerResources.get(pageId);
  if (!resources) {
    return {};
  }

  const data: Record<string, any> = {};
  for (const resource of resources.values()) {
    if (resource.status !== "success") {
      continue;
    }
    data[resource.uid] = resource.value;
  }

  return data;
};

export default useServer;
