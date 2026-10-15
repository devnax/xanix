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
  /** Compile templates for server rendering (ssrRender). Use true for the server build, false for the client build. */
  ssr?: boolean;
  /** Production mode: smaller output, no dev-only metadata. */
  isProduction?: boolean;
  /** Root used to derive stable scope ids. Defaults to process.cwd(). */
  root?: string;
  /** Emit <style> blocks as virtual CSS modules. Defaults to !ssr. */
  styles?: boolean;
};

const STYLE_QUERY = "?vue&type=style";

const vuePlugin = (options: VuePluginOptions = {}): Plugin => {
  const ssr = options.ssr ?? false;
  const isProduction =
    options.isProduction ?? process.env.NODE_ENV === "production";
  const root = options.root ?? process.cwd();
  const emitStyles = options.styles ?? !ssr;

  const cache = new Map<
    string,
    { descriptor: SFCDescriptor; scopeId: string }
  >();

  const getScopeId = (filename: string, source: string) => {
    const key = isProduction
      ? path.relative(root, filename) + source
      : path.relative(root, filename);
    return createHash("sha256").update(key).digest("hex").slice(0, 8);
  };

  return {
    name: "xanix-vue",

    resolveId(id) {
      if (id.includes(STYLE_QUERY)) return id;
      return null;
    },

    async load(id) {
      if (!id.includes(STYLE_QUERY)) return null;

      const [filename, query] = id.split("?");
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

      if (result.errors.length) this.error(result.errors[0].message);

      return { code: result.code, moduleType: "css" };
    },

    async transform(source, id) {
      const [filename, query] = id.split("?");
      if (!filename.endsWith(".vue") || query) return null;

      const { descriptor, errors } = parse(source, { filename });
      if (errors.length) this.error(errors[0].message);

      const scopeId = getScopeId(filename, source);
      const hasScoped = descriptor.styles.some((s) => s.scoped);
      const scopeAttr = `data-v-${scopeId}`;
      cache.set(filename, { descriptor, scopeId });

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
      const styleImports = emitStyles
        ? descriptor.styles
            .map(
              (_, i) =>
                `import ${JSON.stringify(`${filename}${STYLE_QUERY}&index=${i}&lang.css`)};`,
            )
            .join("\n")
        : "";

      const code = [
        styleImports,
        scriptCode,
        templateCode,
        renderKey ? `_sfc_main.${renderKey} = ${renderKey};` : "",
        hasScoped ? `_sfc_main.__scopeId = ${JSON.stringify(scopeAttr)};` : "",
        isProduction ? "" : `_sfc_main.__file = ${JSON.stringify(filename)};`,
        "export default _sfc_main;",
      ]
        .filter(Boolean)
        .join("\n");

      return { code, map: null, moduleType: isTs ? "ts" : "js" };
    },
  };
};

export default vuePlugin;
