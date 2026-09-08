import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

import type { Plugin } from "rolldown";

const ASSET_RE =
  /\.(png|jpe?g|gif|svg|webp|avif|ico|bmp|mp4|webm|ogg|mp3|wav|woff2?|ttf|otf)$/i;

export interface XanixAssetsOptions {
  emit?: boolean;
}

export default function xanixAssets(options: XanixAssetsOptions = {}): Plugin {
  const emit = options.emit ?? true;

  return {
    name: "xanix-assets",

    resolveId(source, importer) {
      if (!importer) {
        return null;
      }

      if (!ASSET_RE.test(source)) {
        return null;
      }

      if (source.startsWith(".") || source.startsWith("/")) {
        return path.resolve(path.dirname(importer), source);
      }

      return null;
    },

    load(id) {
      if (!ASSET_RE.test(id)) {
        return null;
      }

      if (!fs.existsSync(id)) {
        return null;
      }

      const source = fs.readFileSync(id);

      const ext = path.extname(id);
      const basename = path.basename(id, ext);

      const hash = crypto
        .createHash("sha256")
        .update(source)
        .digest("hex")
        .slice(0, 8);

      const fileName = `${basename}-${hash}${ext}`;

      if (emit) {
        this.emitFile({
          type: "asset",
          name: fileName,
          originalFileName: id,
          source,
        });
      }

      return {
        code: `export default ${JSON.stringify(fileName)};`,
        moduleSideEffects: false,
      };
    },
  };
}
