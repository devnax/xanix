import fs from "node:fs";
import path from "node:path";

import alias from "@rollup/plugin-alias";
import type { Plugin } from "rollup";
import ts from "typescript";

export default function xanixTsconfigAlias(): Plugin {
  const root = process.cwd();
  const tsconfigPath = path.resolve(root, "tsconfig.json");

  if (!fs.existsSync(tsconfigPath)) {
    return {
      name: "xanix-tsconfig-alias",
    };
  }

  const result = ts.readConfigFile(tsconfigPath, ts.sys.readFile);

  if (result.error) {
    throw new Error(
      `[xanix] Failed to read tsconfig.json:\n${ts.flattenDiagnosticMessageText(
        result.error.messageText,
        "\n",
      )}`,
    );
  }

  const config = result.config;
  const compilerOptions = config.compilerOptions ?? {};

  const baseUrl = compilerOptions.baseUrl ?? ".";
  const basePath = path.resolve(path.dirname(tsconfigPath), baseUrl);

  const paths = compilerOptions.paths ?? {};

  const entries: any = Object.entries(paths)
    .map(([find, replacements]) => {
      const replacement = (replacements as any)?.[0];

      if (!replacement) return null;

      if (find.endsWith("/*")) {
        const findPrefix = find.slice(0, -2);
        const replacementPrefix = replacement.endsWith("/*")
          ? replacement.slice(0, -2)
          : replacement;

        return {
          find: new RegExp(`^${escapeRegExp(findPrefix)}/(.+)$`),
          replacement: path.resolve(basePath, replacementPrefix) + "/$1",
        };
      }

      return {
        find,
        replacement: path.resolve(basePath, replacement),
      };
    })
    .filter(Boolean);

  return alias({
    customResolver: undefined,
    entries,
  });
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
