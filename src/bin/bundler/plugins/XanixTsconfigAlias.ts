import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import alias from "@rollup/plugin-alias";
import type { Plugin } from "rollup";

export default function xanixTsconfigAlias(): Plugin {
  const root = process.cwd();
  const tsconfigPath = path.resolve(root, "tsconfig.json");

  if (!fs.existsSync(tsconfigPath)) {
    return {
      name: "xanix-tsconfig-alias",
    };
  }

  const configFile = ts.readConfigFile(tsconfigPath, ts.sys.readFile);

  if (configFile.error) {
    const message = ts.flattenDiagnosticMessageText(
      configFile.error.messageText,
      "\n",
    );

    throw new Error(`[xanix] Failed to read tsconfig.json:\n${message}`);
  }

  const config = configFile.config;
  const compilerOptions = config.compilerOptions ?? {};
  const baseUrl = compilerOptions.baseUrl ?? ".";
  const basePath = path.resolve(path.dirname(tsconfigPath), baseUrl);
  const paths = compilerOptions.paths ?? {};

  const entries = Object.entries(paths)
    .map(([find, replacements]: any) => {
      const replacement = replacements[0];

      if (!replacement) {
        return null;
      }

      if (find.includes("*")) {
        const findPrefix = find.replace(/\/?\*$/, "");
        const replacementPrefix = replacement.replace(/\/?\*$/, "");
        return {
          find: new RegExp(`^${escapeRegExp(findPrefix)}/(.+)$`),
          replacement: `${path.resolve(basePath, replacementPrefix)}/$1`,
        };
      }
      return {
        find,
        replacement: path.resolve(basePath, replacement),
      };
    })
    .filter((entry) => entry !== null);

  return alias({
    entries,
  });
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
