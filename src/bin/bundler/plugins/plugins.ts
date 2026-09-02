import type { Plugin } from "rollup";
import XanixTsconfigAlias from "./XanixTsconfigAlias.js";
import XanixDocument from "./XanixDocument/index.js";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import esbuild from "rollup-plugin-esbuild";
import url from "@rollup/plugin-url";
import path from "path";
import { XanixTransform } from "./XanixTransform/index.js";
import xanixReactRefresh from "./XanixReactRefresh.js";
import XanixEnvPlugin from "./XanixEnv.js";
import xanixUseDataId from "./xanixUseDataId.js";

export interface XanixRollupOptions {
  target?: "client" | "server";
  development?: boolean;
  assetExternal?: boolean;
  onChange?: (entry: string, event?: string) => void;
}

export function xanixDefaultPlugins(
  options: XanixRollupOptions = {},
): Plugin[] {
  const target = options.target ?? "client";
  const development = options.development ?? true;
  const isClient = target === "client";
  const isServer = target === "server";

  let _plugins: Plugin[] = [];

  if (isServer) {
    _plugins.push(XanixTransform({ mode: development ? "watch" : "start" }));
    // _plugins.push(XanixDocument());
  } else {
    if (development) {
      _plugins.push(xanixReactRefresh());
    }
  }

  return [
    {
      name: "watch",
      async watchChange(id, change) {
        const entry = path.resolve(id).replaceAll("\\", "/");
        options.onChange?.(entry, change?.event);
      },
    },

    url({
      include: [
        "**/*.jpg",
        "**/*.jpeg",
        "**/*.png",
        "**/*.gif",
        "**/*.webp",
        "**/*.svg",
        "**/*.ico",
        "**/*.woff",
        "**/*.woff2",
        "**/*.ttf",
        "**/*.eot",
        "**/*.css",
      ],
      limit: 0,
      fileName: "assets/[name]-[hash][extname]",
      emitFiles: !(options?.assetExternal ?? false),
    }),

    XanixTsconfigAlias(),
    XanixEnvPlugin({
      mode: development ? "development" : "production",
      isClient,
    }),
    nodeResolve({
      browser: isClient,
      preferBuiltins: isServer,
      extensions: [".mjs", ".js", ".jsx", ".json", ".ts", ".tsx"],
    }),

    commonjs(),
    json(),
    xanixUseDataId(),
    XanixDocument(),
    ..._plugins,

    esbuild({
      target: isClient ? "es2022" : "node20",
      jsx: "automatic",
      tsconfig: false,
      minify: !development,
      define: {
        __XANIX_CLIENT__: JSON.stringify(isClient),
        __XANIX_SERVER__: JSON.stringify(isServer),
        __XANIX_DEV__: JSON.stringify(development),
        __XANIX_PROD__: JSON.stringify(!development),
      },
    }),
  ];
}
