import path from "node:path";
import type { Plugin } from "rollup";

type XanixAssetsOptions = {
  external?: boolean;
};

const assetRegex = /\.(png|jpe?g|gif|webp|svg|ico|woff|woff2|ttf|eot)$/i;

export default function xanixAssets(options: XanixAssetsOptions = {}): Plugin {
  return {
    name: "xanix-assets",

    resolveId(source, importer) {
      if (!assetRegex.test(source)) {
        return null;
      }

      if (options.external) {
        // Let Rollup treat the asset as an external module.
        return {
          id: source,
          external: true,
        };
      }

      if (!importer) {
        return null;
      }

      return path.resolve(path.dirname(importer), source);
    },

    load(id) {
      if (options.external || !assetRegex.test(id)) {
        return null;
      }

      const url = "/" + path.relative(process.cwd(), id).replace(/\\/g, "/");
      return `export default ${JSON.stringify(url)};`;
    },
  };
}
