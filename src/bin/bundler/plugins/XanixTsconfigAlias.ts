import fs from "node:fs";
import path from "node:path";
import alias from "@rollup/plugin-alias";
import ts from "typescript";
import type { Plugin } from "rollup";

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
    const message = ts.flattenDiagnosticMessageText(
      result.error.messageText,
      "\n",
    );

    throw new Error(`[xanix] Failed to read tsconfig.json:\n${message}`);
  }

  const config = result.config;
  const compilerOptions = config.compilerOptions ?? {};
  const baseUrl = compilerOptions.baseUrl ?? ".";
  const basePath = path.resolve(path.dirname(tsconfigPath), baseUrl);
  const paths = compilerOptions.paths ?? {};

  const entries = Object.entries(paths)
    .map(([find, replacements]) => {
      const replacement = (replacements as any)?.[0];
      if (!replacement) return null;

      // @components/*
      if (find.endsWith("/*")) {
        const findPrefix = find.slice(0, -2);
        const replacementPrefix = replacement.endsWith("/*")
          ? replacement.slice(0, -2)
          : replacement;

        return {
          find: new RegExp(`^${escapeRegExp(findPrefix)}/(.+)$`),

          replacement: `${path.resolve(basePath, replacementPrefix)}/$1`,
        };
      }

      // @foo
      return {
        find,
        replacement: path.resolve(basePath, replacement),
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  return alias({
    entries,
  });
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
