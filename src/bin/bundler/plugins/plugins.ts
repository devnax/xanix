import type { Plugin } from "rollup";
import XanixTsconfigAlias from "./XanixTsconfigAlias.js";
import XanixDocument from "./XanixDocument/index.js";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import esbuild from "rollup-plugin-esbuild";
import url from "@rollup/plugin-url";
import path from "path";
import XanixPageTransform from "./XanixPageTransform/index.js";
import xanixReactRefresh from "./XanixReactRefresh.js";
import XanixEnvPlugin from "./XanixEnv.js";
import XanixUseServer from "./XanixUseServer.js";
import XanixServerTransform from "./XanixServerTransform.js";
import defines from "../config/defines.js";
import { XanixClientEntry } from "../../types.js";
import { XanixEntryFinder } from "./XanixEntryFinder/index.js";

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
    XanixTsconfigAlias(),

    // {
    //   name: "watch",
    //   async watchChange(id, change) {
    //     const entry = path.resolve(id).replaceAll("\\", "/");
    //     options.onChange?.(entry, change?.event);
    //   },
    // },

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
    XanixDocument(),
    XanixUseServer({ isClient }),
    ..._plugins,

    esbuild({
      target: isClient ? "es2022" : "node20",
      jsx: "automatic",
      tsconfig: false,
      minify: !development,
      define: defines({
        mode: development ? "development" : "production",
        isClient,
      }),
    }),
  ];
}

export function xanixCachePlugins(): Plugin[] {
  const isClient = true;
  const development = true;
  return [
    XanixTsconfigAlias(),

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
      emitFiles: false,
    }),

    XanixEnvPlugin({
      mode: development ? "development" : "production",
      isClient,
    }),

    nodeResolve({
      browser: isClient,
      preferBuiltins: !isClient,
      extensions: [".mjs", ".js", ".jsx", ".json", ".ts", ".tsx"],
    }),

    commonjs(),
    json(),
    XanixDocument(),

    esbuild({
      target: "es2022",
      jsx: "automatic",
      tsconfig: false,
      minify: false,
      define: defines({
        mode: development ? "development" : "production",
        isClient,
      }),
    }),
  ];
}

export function xanixGenerateClientEntryPlugins({
  entries,
}: {
  entries: Map<string, XanixClientEntry>;
}): Plugin[] {
  const isClient = false;
  const development = true;
  return [
    XanixTsconfigAlias(),
    XanixEntryFinder({
      entries,
    }),

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
      emitFiles: false,
    }),

    XanixEnvPlugin({
      mode: development ? "development" : "production",
      isClient,
    }),

    nodeResolve({
      browser: isClient,
      preferBuiltins: !isClient,
      extensions: [".mjs", ".js", ".jsx", ".json", ".ts", ".tsx"],
    }),

    commonjs(),
    json(),
    XanixDocument(),

    esbuild({
      target: "es2022",
      jsx: "automatic",
      tsconfig: false,
      minify: false,
      define: defines({
        mode: development ? "development" : "production",
        isClient,
      }),
    }),
  ];
}
