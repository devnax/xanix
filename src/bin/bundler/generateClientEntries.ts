import { rollup } from "rollup";
import path from "node:path";
import rollupEsbuild from "./plugins/rollupEsbuild.js";
import XanixAssets from "./plugins/XanixAssets/index.js";
import { XanixClientEntry } from "../types.js";
import { XanixEntryFinder } from "./plugins/XanixEntryFinder/index.js";
const root = process.cwd();

const generateClientEntries = async (): Promise<XanixClientEntry[]> => {
  const entries = new Map<string, XanixClientEntry>();
  const bundle = await rollup({
    input: path.resolve(root, "index.tsx"),
    plugins: [
      XanixAssets({
        external: true,
      }),
      XanixEntryFinder({
        entries,
      }),
      rollupEsbuild(),
    ],

    external(id) {
      if (id.startsWith(".") || path.isAbsolute(id)) {
        return false;
      }
      return true;
    },
  });
  await bundle.close();
  return Array.from(entries.values());
};

export default generateClientEntries;
