import { compile } from "svelte/compiler";
import type { Plugin } from "rolldown";

export interface SveltePluginOptions {
  ssr?: boolean;
  dev?: boolean;
}

function SveltePlugin(options: SveltePluginOptions = {}): Plugin {
  const ssr = options.ssr ?? false;
  const dev = options.dev ?? false;
  const hmr = !ssr && dev;

  return {
    name: "xanix:svelte",

    transform: {
      filter: { id: /\.svelte(\?.*)?$/ },

      handler(code, id) {
        const filename = id.split("?")[0];

        try {
          const result = compile(code, {
            filename,
            generate: ssr ? "server" : "client",
            dev: false,
            css: "injected",
            hmr,
          });

          for (const warning of result.warnings) {
            this.warn({
              message: warning.message,
              loc: warning.start && {
                file: filename,
                line: warning.start.line,
                column: warning.start.column,
              },
            });
          }

          let output = result.js.code;

          if (hmr) {
            output = `
const __xanixHot = window.__xanix_createHot(
  ${JSON.stringify(filename)}
);

${output.replaceAll("import.meta.hot", "__xanixHot")}
`;
          }

          return {
            code: output,
            map: result.js.map,
          };
        } catch (error) {
          this.error(error instanceof Error ? error.message : String(error));
        }
      },
    },
  };
}

export default SveltePlugin;
