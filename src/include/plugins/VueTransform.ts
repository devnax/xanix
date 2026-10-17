import path from "node:path";
import { createHash } from "node:crypto";
import type { Plugin } from "rolldown";
import {
  parse,
  compileScript,
  compileTemplate,
  compileStyleAsync,
  rewriteDefault,
} from "vue/compiler-sfc";

export type VuePluginOptions = {
  /** Compile for server rendering (ssrRender + style collection). false = client build with HMR. */
  ssr?: boolean;
};

const vuePlugin = (options: VuePluginOptions = {}): Plugin => {
  const ssr = options.ssr ?? false;
  const isProduction = process.env.NODE_ENV === "production";
  const root = process.cwd();
  const hmr = !ssr;

  const getScopeId = (filename: string, source: string) => {
    const key = isProduction
      ? path.relative(root, filename) + source
      : path.relative(root, filename);
    return createHash("sha256").update(key).digest("hex").slice(0, 8);
  };

  return {
    name: "xanix-vue",

    async transform(source, id) {
      const [filename, query] = id.split("?");
      if (!filename.endsWith(".vue") || query) return null;

      const { descriptor, errors } = parse(source, { filename });
      if (errors.length) this.error(errors[0].message);

      const scopeId = getScopeId(filename, source);
      const hasScoped = descriptor.styles.some((s) => s.scoped);
      const scopeAttr = `data-v-${scopeId}`;

      const lang = descriptor.scriptSetup?.lang ?? descriptor.script?.lang;
      const isTs = lang === "ts" || lang === "tsx";

      // Script
      let scriptCode = "const _sfc_main = {};";
      let bindings: Record<string, any> | undefined;

      if (descriptor.script || descriptor.scriptSetup) {
        const script = compileScript(descriptor, {
          id: scopeId,
          isProd: isProduction,
          inlineTemplate: false,
          templateOptions: { ssr },
        });
        bindings = script.bindings;
        scriptCode = rewriteDefault(
          script.content,
          "_sfc_main",
          isTs ? ["typescript"] : [],
        );
      }

      // Template
      let templateCode = "";
      let renderKey = "";

      if (descriptor.template) {
        const template = compileTemplate({
          source: descriptor.template.content,
          filename,
          id: scopeId,
          scoped: hasScoped,
          ssr,
          ssrCssVars: descriptor.cssVars,
          isProd: isProduction,
          compilerOptions: {
            bindingMetadata: bindings,
            scopeId: hasScoped ? scopeAttr : undefined,
          },
        });

        if (template.errors.length) {
          const first = template.errors[0];
          this.error(typeof first === "string" ? first : first.message);
        }

        templateCode = template.code;
        renderKey = ssr ? "ssrRender" : "render";
      }

      // Styles
      let styleCode = "";
      let ssrStyleCode = "";

      if (descriptor.styles.length) {
        const chunks: string[] = [];
        for (const style of descriptor.styles) {
          const result = await compileStyleAsync({
            source: style.content,
            filename,
            id: scopeAttr,
            scoped: !!style.scoped,
            preprocessLang: style.lang as any,
            isProd: isProduction,
          });
          if (result.errors.length) this.error(result.errors[0].message);
          chunks.push(result.code);
        }

        const css = chunks.join("\n");
        const styleId = `vue-style-${scopeId}`;

        if (css && !ssr) {
          // Client: inject (or reuse the server-rendered tag) and update on re-eval
          styleCode = `(function () {
  if (typeof document === "undefined") return;
  var id = ${JSON.stringify(styleId)};
  var el = document.getElementById(id);
  if (!el) {
    el = document.createElement("style");
    el.id = id;
    document.head.appendChild(el);
  }
  el.textContent = ${JSON.stringify(css)};
})();`;
        }

        if (css && ssr) {
          ssrStyleCode = `import { useSSRContext as _xanixUseSSRContext } from "vue";
const _xanixSetup = _sfc_main.setup;
_sfc_main.setup = function (props, ctx) {
  const s = _xanixUseSSRContext();
  if (s) (s.__styles || (s.__styles = new Map())).set(${JSON.stringify(styleId)}, ${JSON.stringify(css)});
  return _xanixSetup ? _xanixSetup.call(this, props, ctx) : undefined;
};`;
        }
      }

      // HMR (client only)
      const hmrCode = hmr
        ? `_sfc_main.__hmrId = ${JSON.stringify(scopeId)};
typeof __VUE_HMR_RUNTIME__ !== "undefined" && __VUE_HMR_RUNTIME__.createRecord(_sfc_main.__hmrId, _sfc_main);
`
        : "";

      const code = [
        styleCode,
        scriptCode,
        ssrStyleCode,
        templateCode,
        renderKey ? `_sfc_main.${renderKey} = ${renderKey};` : "",
        hasScoped ? `_sfc_main.__scopeId = ${JSON.stringify(scopeAttr)};` : "",
        isProduction ? "" : `_sfc_main.__file = ${JSON.stringify(filename)};`,
        hmrCode,
        "export default _sfc_main;",
      ]
        .filter(Boolean)
        .join("\n");

      return { code, map: null, moduleType: isTs ? "ts" : "js" };
    },
  };
};

export default vuePlugin;
