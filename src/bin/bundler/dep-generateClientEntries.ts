import { rollup } from "rollup";
import path from "node:path";
import { type XanixClientEntry } from "../types.js";
import { xanixGenerateClientEntryPlugins } from "./plugins/plugins.js";
import external from "./config/external.js";

const root = process.cwd();
const generateClientEntries = async ({
  rootEntry,
}: {
  rootEntry: string;
}): Promise<XanixClientEntry[]> => {
  const entries = new Map<string, XanixClientEntry>();
  const bundle = await rollup({
    input: path.resolve(root, rootEntry),
    plugins: [
      ...xanixGenerateClientEntryPlugins({
        entries,
      }),
    ],

    external(id) {
      if (!external(id)) {
        return false;
      }
      return true;
    },
  });
  await bundle.close();
  return Array.from(entries.values());
};

export default generateClientEntries;
