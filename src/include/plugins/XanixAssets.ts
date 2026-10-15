import fs from "node:fs";
import path from "node:path";
import type { Plugin } from "rolldown";
import { uuid } from "../utils.js";

const ASSET_RE =
  /\.(css|png|jpe?g|gif|svg|webp|avif|ico|bmp|mp4|webm|ogg|mp3|wav|woff2?|ttf|otf)$/i;

export default function xanixAssets(
  assets?: Map<string, { type: string; path: string; name: string }>,
): Plugin {
  return {
    name: "xanix-assets",

    resolveId(source, importer) {
      if (!importer || !ASSET_RE.test(source)) {
        return null;
      }

      if (source.startsWith(".") || source.startsWith("/")) {
        return path.resolve(path.dirname(importer), source);
      }

      return null;
    },

    load(id) {
      if (!ASSET_RE.test(id) || !fs.existsSync(id)) {
        return null;
      }

      const ext = path.extname(id);
      const basename = path.basename(id, ext);
      const hash = uuid(id, 8);
      const fileName = `${basename}-${hash}${ext}`;

      if (ext === ".css") {
        this.addWatchFile(id);
      }

      const asset = {
        type: ext.slice(1),
        path: id,
        name: fileName,
      };
      assets?.set(fileName, { ...asset, name: fileName });

      return {
        code: `import {xanix} from "xanix"
          const assetData = xanix.asset(${JSON.stringify(asset)});
          export default assetData;`,
        moduleSideEffects: true,
        moduleType: "js",
      };
    },
  };
}
