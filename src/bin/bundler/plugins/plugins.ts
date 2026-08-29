import type { Plugin } from "rollup";
import XanixTsconfigAlias from "./XanixTsconfigAlias.js";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import replace from "@rollup/plugin-replace";
import esbuild from "rollup-plugin-esbuild";
import url from "@rollup/plugin-url";
import path from "path";
import { XanixTransform } from "./XanixTransform/index.js";
import xanixReactRefresh from "./XanixReactRefresh.js";
import xanixBrowserCodeRemover from "./XanixBrowserCodeRemover.js";
import XanixEnvPlugin from "./XanixEnv.js";

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
    // _plugins.push(xanixBrowserCodeRemover());
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
    ..._plugins,

    esbuild({
      target: isClient ? "es2022" : "node20",
      jsx: "automatic",
      tsconfig: false,
      minify: !development,
    }),
  ];
}
