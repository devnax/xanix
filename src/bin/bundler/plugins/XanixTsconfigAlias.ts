import fs from "node:fs";
import path from "node:path";
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

  let config: any;

  try {
    const content = fs.readFileSync(tsconfigPath, "utf8");
    config = parseJsonc(content);
  } catch (error: any) {
    throw new Error(`[xanix] Failed to read tsconfig.json:\n${error.message}`);
  }

  const compilerOptions = config.compilerOptions ?? {};
  const baseUrl = compilerOptions.baseUrl ?? ".";
  const basePath = path.resolve(path.dirname(tsconfigPath), baseUrl);
  const paths = compilerOptions.paths ?? {};

  const entries = Object.entries(paths)
    .map(([find, replacements]: [string, any]) => {
      const replacement = replacements?.[0];
      if (!replacement) return null;

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
    .filter(Boolean) as any[];

  return alias({
    entries,
  });
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseJsonc(content: string) {
  const withoutComments = content
    // Remove /* block comments */
    .replace(/\/\*[\s\S]*?\*\//g, "")
    // Remove // comments
    .replace(/\/\/.*$/gm, "");

  // Remove trailing commas
  const withoutTrailingCommas = withoutComments.replace(/,\s*([}\]])/g, "$1");

  return JSON.parse(withoutTrailingCommas);
}
