import path from "node:path";
import { createHash } from "node:crypto";
import type { Plugin } from "rolldown";
import {
  parse,
  compileScript,
  compileTemplate,
  compileStyleAsync,
  rewriteDefault,
  type SFCDescriptor,
} from "vue/compiler-sfc";

export type VuePluginOptions = {
  ssr?: boolean;
  isProduction?: boolean;
  root?: string;
  styles?: boolean;
  hmr?: boolean;
};

const STYLE_QUERY = "?vue&type=style";

const vuePlugin = (options: VuePluginOptions = {}): Plugin => {
  const ssr = options.ssr ?? false;
  const isProduction =
    options.isProduction ?? process.env.NODE_ENV === "production";
  const root = path.resolve(options.root ?? process.cwd());
  const emitStyles = options.styles ?? !ssr;
  const hmr = options.hmr ?? (!ssr && !isProduction);

  const cache = new Map<
    string,
    { descriptor: SFCDescriptor; scopeId: string }
  >();

  const normalize = (filename: string) =>
    path.resolve(filename).replaceAll("\\", "/");

  const getScopeId = (filename: string, source: string) => {
    const key = isProduction
      ? path.relative(root, filename) + source
      : path.relative(root, filename);

    return createHash("sha256").update(key).digest("hex").slice(0, 8);
  };

  const getComponentId = (filename: string) =>
    path.relative(root, filename).replaceAll("\\", "/");

  return {
    name: "xanix-vue",

    resolveId(id) {
      if (id.includes(STYLE_QUERY)) return id;
      return null;
    },

    async load(id) {
      if (!id.includes(STYLE_QUERY)) return null;

      const [rawFilename, query] = id.split("?");
      const filename = normalize(rawFilename);
      const entry = cache.get(filename);

      if (!entry) return null;

      const index = Number(new URLSearchParams(query).get("index") ?? 0);
      const style = entry.descriptor.styles[index];

      if (!style) return null;

      const result = await compileStyleAsync({
        source: style.content,
        filename,
        id: `data-v-${entry.scopeId}`,
        scoped: !!style.scoped,
        preprocessLang: style.lang as any,
        isProd: isProduction,
      });

      if (result.errors.length) {
        this.error(result.errors[0].message);
      }

      return { code: result.code, moduleType: "css" };
    },

    async transform(source, id) {
      const [rawFilename, query] = id.split("?");
      if (!rawFilename.endsWith(".vue") || query) return null;

      const filename = normalize(rawFilename);
      const { descriptor, errors } = parse(source, { filename });

      if (errors.length) {
        const first = errors[0];
        this.error(typeof first === "string" ? first : first.message);
      }

      const scopeId = getScopeId(filename, source);
      const componentId = getComponentId(filename);
      const hasScoped = descriptor.styles.some((style) => style.scoped);
      const scopeAttr = `data-v-${scopeId}`;

      cache.set(filename, { descriptor, scopeId });

      const lang = descriptor.scriptSetup?.lang ?? descriptor.script?.lang;
      const isTs = lang === "ts" || lang === "tsx";

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

      const styleImports = emitStyles
        ? descriptor.styles
            .map(
              (_, i) =>
                `import ${JSON.stringify(
                  `${filename}${STYLE_QUERY}&index=${i}&lang.css`,
                )};`,
            )
            .join("\n")
        : "";

      const hmrCode =
        hmr && !ssr
          ? `
_sfc_main.__hmrId = ${JSON.stringify(componentId)};

if (typeof __VUE_HMR_RUNTIME__ !== "undefined") {
  __VUE_HMR_RUNTIME__.createRecord(
    ${JSON.stringify(componentId)},
    _sfc_main
  );
}
`
          : "";

      const code = [
        styleImports,
        scriptCode,
        templateCode,
        renderKey ? `_sfc_main.${renderKey} = ${renderKey};` : "",
        hasScoped ? `_sfc_main.__scopeId = ${JSON.stringify(scopeAttr)};` : "",
        isProduction ? "" : `_sfc_main.__file = ${JSON.stringify(filename)};`,
        hmrCode,
        "export default _sfc_main;",
      ]
        .filter(Boolean)
        .join("\n");

      return {
        code,
        map: null,
        moduleType: isTs ? "ts" : "js",
      };
    },
  };
};

export default vuePlugin;
