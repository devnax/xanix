import fs from "node:fs";
import path from "node:path";

import type { Plugin } from "rollup";
import ts from "typescript";

type TsconfigPathAlias = {
  pattern: string;
  wildcard: boolean;
  replacement: string;
};

type TsconfigConfig = {
  basePath: string;
  aliases: TsconfigPathAlias[];
};

const EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"];

function getConfig(): TsconfigConfig {
  const root = process.cwd();
  const tsconfigPath = path.resolve(root, "tsconfig.json");

  if (!fs.existsSync(tsconfigPath)) {
    return {
      basePath: root,
      aliases: [],
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
  const tsconfigDir = path.dirname(tsconfigPath);
  const baseUrl = compilerOptions.baseUrl ?? ".";
  const basePath = path.resolve(tsconfigDir, baseUrl);
  const paths = compilerOptions.paths ?? {};
  const aliases: TsconfigPathAlias[] = [];

  for (const [pattern, replacements] of Object.entries(paths)) {
    const replacement = (replacements as any)?.[0];
    if (!replacement) {
      continue;
    }

    const wildcard = pattern.endsWith("/*");
    aliases.push({
      pattern: wildcard ? pattern.slice(0, -2) : pattern,
      wildcard,
      replacement: wildcard
        ? replacement.endsWith("/*")
          ? replacement.slice(0, -2)
          : replacement
        : replacement,
    });
  }

  return {
    basePath,
    aliases,
  };
}

const config = getConfig();

/**
 * Check whether an import matches a tsconfig path alias.
 *
 * Examples:
 *
 * @db
 * @db/index
 * @db/user
 *
 * with:
 *
 * "@db/*": ["./src/db/*"]
 */

export function tsconfigPathsMatcher(id: string): boolean {
  for (const alias of config.aliases) {
    if (!alias.wildcard) {
      if (id === alias.pattern) {
        return true;
      }
      continue;
    }

    if (id === alias.pattern || id.startsWith(`${alias.pattern}/`)) {
      return true;
    }
  }
  return false;
}

/**
 * Resolve a tsconfig path alias.
 */
function resolveTsconfigAlias(source: string): string | null {
  for (const alias of config.aliases) {
    let target: string | null = null;

    /*
     * Exact alias
     *
     * "@db": ["./src/db"]
     */
    if (!alias.wildcard) {
      if (source !== alias.pattern) {
        continue;
      }

      target = alias.replacement;
    } else {
      /*
       * Wildcard alias
       *
       * "@db/*": ["./src/db/*"]
       *
       * @db/index
       *      ↓
       * ./src/db/index
       */
      if (source !== alias.pattern && !source.startsWith(`${alias.pattern}/`)) {
        continue;
      }

      const subPath =
        source === alias.pattern ? "" : source.slice(alias.pattern.length + 1);

      target = path.join(alias.replacement, subPath);
    }

    const absoluteTarget = path.resolve(config.basePath, target);
    const resolved = resolvePath(absoluteTarget);
    if (resolved) {
      return resolved;
    }

    throw new Error(
      `[xanix] Cannot resolve "${source}"\n` + `Target: ${absoluteTarget}`,
    );
  }

  return null;
}

/**
 * Resolve:
 *
 * file.ts
 * file.tsx
 * file.js
 * directory/index.ts
 * directory/index.tsx
 * etc.
 */
function resolvePath(input: string): string | null {
  /*
   * Exact file.
   */
  if (isFile(input)) {
    return input;
  }

  /*
   * Extension resolution.
   *
   * ./db/index
   *
   * →
   *
   * ./db/index.ts
   */
  for (const extension of EXTENSIONS) {
    const candidate = `${input}${extension}`;

    if (isFile(candidate)) {
      return candidate;
    }
  }

  /*
   * Directory resolution.
   *
   * ./db
   *
   * →
   *
   * ./db/index.ts
   */
  if (isDirectory(input)) {
    for (const extension of EXTENSIONS) {
      const candidate = path.join(input, `index${extension}`);

      if (isFile(candidate)) {
        return candidate;
      }
    }
  }

  return null;
}

function isFile(file: string): boolean {
  try {
    return fs.statSync(file).isFile();
  } catch {
    return false;
  }
}

function isDirectory(directory: string): boolean {
  try {
    return fs.statSync(directory).isDirectory();
  } catch {
    return false;
  }
}

/**
 * Rollup plugin.
 */
export default function xanixTsconfigAlias(): Plugin {
  return {
    name: "xanix-tsconfig-alias",

    resolveId(source) {
      const resolved = resolveTsconfigAlias(source);
      if (resolved) {
        return resolved;
      }

      return null;
    },
  };
}
