import type { Plugin } from "rolldown";
import XanixTsconfigAlias from "./XanixTsconfigAlias.js";
import XanixDocument from "./XanixDocument/index.js";
import XanixPageTransform from "./XanixPageTransform/index.js";
import xanixReactRefresh from "./XanixReactRefresh.js";
import XanixUseServer from "./XanixUseServer.js";
import XanixServerTransform from "./XanixServerTransform.js";
import XanixAssets from "./XanixAssets.js";

export interface XanixRollupOptions {
  target?: "client" | "server";
  development?: boolean;
  assetExternal?: boolean;
  // onChange?: (entry: string, event?: string) => void;
  WebSocketPort?: number;
}

export function xanixDefaultPlugins(options: XanixRollupOptions): Plugin[] {
  const target = options.target ?? "client";
  const development = options.development ?? true;
  const isClient = target === "client";
  const isServer = target === "server";

  let _plugins: Plugin[] = [];

  if (isServer) {
    _plugins.push(XanixPageTransform());
    _plugins.push(
      XanixServerTransform({ mode: development ? "watch" : "start" }),
    );
  } else {
    if (development) {
      _plugins.push(xanixReactRefresh(options.WebSocketPort as number));
    }
  }

  return [
    XanixAssets({
      emit: isServer,
    }),
    XanixTsconfigAlias(),
    XanixDocument(),
    XanixUseServer({ isClient }),
    ..._plugins,
  ];
}

export function xanixCachePlugins(): Plugin[] {
  const isClient = true;
  const development = true;
  return [XanixTsconfigAlias(), XanixDocument()];
}
