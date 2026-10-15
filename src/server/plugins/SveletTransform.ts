import { compile } from "svelte/compiler";
import type { Plugin } from "rolldown";

export interface SveltePluginOptions {
  generate?: "client" | "server";
}

function xanixSvelte(options: SveltePluginOptions = {}): Plugin {
  const generate = options.generate ?? "client";

  return {
    name: "xanix:svelte",

    transform: {
      filter: { id: /\.svelte$/ },

      handler(code, id) {
        const result = compile(code, {
          filename: id,
          generate: "server",
          dev: false,
        });

        return {
          code: result.js.code,
          map: result.js.map,
        };
      },
    },
  };
}

export default xanixSvelte;
