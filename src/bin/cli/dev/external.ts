import type { Plugin } from "rollup";
import fs from "node:fs";
import path from "node:path";

const outputDir = path.resolve(process.cwd(), ".xanix/client");

const externalPackages = new Set<string>();

function getPackageName(id: string): string | null {
  if (id.startsWith(".") || path.isAbsolute(id)) {
    return null;
  }

  if (
    id.startsWith(".") ||
    id.startsWith("/") ||
    id.startsWith("\0") ||
    id.startsWith("node:")
  ) {
    return null;
  }

  if (id.startsWith("@")) {
    const parts = id.split("/");

    if (parts.length < 2) {
      return null;
    }

    return `${parts[0]}/${parts[1]}`;
  }

  return id.split("/")[0];
}

const vendorExternalPlugin = (): Plugin => {
  return {
    name: "xanix-vendor-external",

    resolveId(source) {
      const packageName = getPackageName(source);
      if (!packageName) {
        return null;
      }
      externalPackages.add(source);

      return {
        id: source,
        external: true,
      };
    },

    generateBundle(_, bundle) {
      const imports = new Set<string>();

      for (const output of Object.values(bundle)) {
        if (output.type !== "chunk") {
          continue;
        }

        for (const imported of output.imports) {
          const packageName = getPackageName(imported);

          if (packageName) {
            imports.add(imported);
          }
        }
      }

      const importMap: Record<string, string> = {};

      for (const specifier of imports) {
        importMap[specifier] = "/client/vendor.js";
      }

      fs.writeFileSync(
        path.join(outputDir, "importmap.json"),
        JSON.stringify(
          {
            imports: importMap,
          },
          null,
          2,
        ),
        "utf8",
      );
    },
  };
};

export default vendorExternalPlugin;
