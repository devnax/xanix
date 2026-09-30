import { Plugin } from "rolldown";
import { isPackageImport, makeFilename } from "./utils.js";
import type { CachedModule } from "./types.js";
import buildCache from "./buildCache.js";

const XanixCache = (): Plugin => {
  const cached = new Map<string, CachedModule>();
  let changed = false;

  return {
    name: "xanix-cache",

    resolveId(source, importer) {
      if (!isPackageImport(source) || !importer || source.startsWith("xanix")) {
        return null;
      }

      const name = makeFilename(source);
      if (!cached.has(source)) {
        changed = true;
      }

      cached.set(source, {
        module: source,
        name: name,
      });

      return {
        id: `/xanix-cache/${name}.js`,
        external: true,
      };
    },

    async generateBundle() {
      if (!changed) {
        return;
      }
      //   await buildCache(cached);
    },

    // transform(code, id, meta) {
    //   if (id.includes("node_modules")) {
    //     return null;
    //   }

    //   // user codes
    //   let changed = false;

    //   const transformed = code.replace(
    //     /import\s*\{([^}]+)\}\s*from\s*(['"])([^'"]+)\2\s*;?/g,
    //     (match, imports: string, quote: string, source: string) => {
    //       if (source.startsWith("xanix")) {
    //         return match;
    //       }
    //       if (!isPackageImport(source)) {
    //         return match;
    //       }

    //       const cleanSource = source.split("?")[0];
    //       const name = makeFilename(cleanSource);
    //       changed = true;

    //       const localName = `_${name.replace(/[^a-zA-Z0-9_$]/g, "_")}`;

    //       const declarations = imports
    //         .split(",")
    //         .map((item: string) => {
    //           const [imported, local] = item
    //             .trim()
    //             .split(/\s+as\s+/)
    //             .map((x) => x.trim());

    //           return local ? `${imported}: ${local}` : imported;
    //         })
    //         .join(", ");

    //       return [
    //         `import ${localName} from ${quote}/xanix-cache/${name}.js${quote};`,
    //         `const { ${declarations} } = ${localName};`,
    //       ].join("\n");
    //     },
    //   );

    //   if (!changed) {
    //     return null;
    //   }
    //   return {
    //     code: transformed,
    //     map: null,
    //   };
    // },
  };
};

export default XanixCache;
