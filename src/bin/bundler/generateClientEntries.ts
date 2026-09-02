import { rollup } from "rollup";
import path from "node:path";
import { type XanixClientEntry } from "../types.js";
import { XanixEntryFinder } from "./plugins/XanixEntryFinder/index.js";
import { xanixDefaultPlugins } from "./plugins/plugins.js";

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
      XanixEntryFinder({
        entries,
      }),
      ...xanixDefaultPlugins({
        target: "server",
        development: true,
        assetExternal: true,
      }),
    ],

    external(id) {
      if (
        id.startsWith(".") ||
        path.isAbsolute(id) ||
        id === "@" ||
        id.startsWith("@/")
      ) {
        return false;
      }
      return true;
    },
  });
  await bundle.close();
  return Array.from(entries.values());
};

export default generateClientEntries;
