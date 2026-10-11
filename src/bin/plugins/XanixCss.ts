import fs from "node:fs";
import path from "node:path";
import type { Plugin } from "rolldown";
import { uuid } from "../include/utils.js";

const PREFIX = "\0xanix-css:";

export interface XanixCSSOptions {
  emit?: boolean;
}

export default function xanixCSS(options: XanixCSSOptions = {}): Plugin {
  const emit = options.emit ?? true;

  return {
    name: "xanix-css",

    resolveId(source, importer) {
      if (
        !importer ||
        !/\.css(?:\?.*)?$/.test(source) ||
        source.startsWith(PREFIX)
      ) {
        return null;
      }

      const cleanSource = source.split("?")[0];
      if (!cleanSource.startsWith(".") && !path.isAbsolute(cleanSource)) {
        return null;
      }

      const resolved = path.resolve(path.dirname(importer), cleanSource);
      if (!fs.existsSync(resolved)) {
        return null;
      }

      return {
        id: `${PREFIX}${resolved}`,
        moduleSideEffects: true,
      };
    },

    load(id) {
      if (!id.startsWith(PREFIX) || !emit) {
        return null;
      }

      const file = id.slice(PREFIX.length);
      if (!fs.existsSync(file)) {
        return null;
      }

      this.addWatchFile(file);
      const css = fs.readFileSync(file);
      const basename = path.basename(file, ".css");
      const fileName = `${basename}-${uuid(file, 8)}.css`;

      if (emit) {
        this.emitFile({
          type: "asset",
          name: fileName,
          source: css,
        });
      }

      return {
        code: `
            import {xanix} from "xanix"
            xanix.css(\`${file}\`, \`${fileName}\`);
        `,
        moduleType: "js",
        moduleSideEffects: true,
      };
    },
  };
}
