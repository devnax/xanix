import usePage from "./usePage.js";
import React, { useEffect, useRef } from "react";
import useDocument from "./useDocument.js";
import loader from "../dataLoader.js";

type Callback = (args: Record<string, any>) => Promise<any>;

const useData = (
  _callback: Callback,
  _args?: Record<string, any>,
): { data: any; loading: boolean; reload: () => Promise<void> } => {
  return {} as { data: any; loading: boolean; reload: () => Promise<void> };
};

useData.register = (xanixId: string, callback: Callback) => {
  if (typeof __XANIX_SERVER__ !== "undefined" && __XANIX_SERVER__) {
    loader.register(xanixId, callback);
    return (args?: Record<string, any>) => {
      const page = usePage();
      const doc = useDocument();

      loader.registerPage(page.pageId, xanixId, args ?? {});
      const pageData = doc.pageData || {};
      const itemData = pageData[xanixId];

      return {
        data: itemData,
        loading: false,
        reload: async () => {},
      };
    };
  } else {
    return (args?: Record<string, any>) => {
      const doc = useDocument();
      const pageData = doc.pageData || {};
      const itemData = pageData[xanixId];

      const [loading, setLoading] = React.useState(!itemData);
      const [data, setData] = React.useState(itemData);
      const init = useRef(false);

      const reload = async () => {
        setLoading(true);
        const res = await fetch(`/.xanix/__data__/${xanixId}`, {
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

      useEffect(() => {
        if (init.current) {
          reload();
        } else if (!itemData) {
          reload();
        }
        init.current = true;
      }, [JSON.stringify(args)]);

      return {
        data,
        loading,
        reload,
      };
    };
  }
};

export default useData;
