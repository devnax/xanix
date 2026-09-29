import path from "node:path";
import { ResolverFactory } from "oxc-resolver";
import type { Plugin, ResolvedId } from "rollup";

export interface OxcResolverOptions {
  extensions?: string[];
  conditionNames?: string[];
  mainFields?: string[];
  aliasFields?: string[];
  tsconfig?: string;
  symlinks?: boolean;
}

function XanixResolver(options: OxcResolverOptions = {}): Plugin {
  const resolver = new ResolverFactory({
    extensions: options.extensions ?? [
      ".mjs",
      ".js",
      ".json",
      ".ts",
      ".tsx",
      ".jsx",
    ],

    conditionNames: options.conditionNames ?? [
      "node",
      "import",
      "module",
      "default",
    ],

    mainFields: options.mainFields ?? ["module", "main"],
    aliasFields: options.aliasFields ?? [],
    symlinks: options.symlinks ?? true,
    tsconfig: options.tsconfig
      ? {
          configFile: options.tsconfig,
        }
      : undefined,
  });

  return {
    name: "xanix-oxc-resolver",

    resolveId(source, importer, options) {
      if (!importer) {
        return null;
      }

      if (source.startsWith("\0") || source.startsWith("virtual:")) {
        return null;
      }

      try {
        const result = resolver.resolveFileSync(importer, source);

        if (!result.path) {
          return null;
        }

        return {
          id: result.path,
          external: false,
        } as ResolvedId;
      } catch {
        if (options?.isEntry) {
          return null;
        }

        return null;
      }
    },
  };
}

export default XanixResolver;
