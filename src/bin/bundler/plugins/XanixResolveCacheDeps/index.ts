import path from "node:path";
import { XanixClientEntry } from "../../../types";
import type { Plugin } from "rollup";
import BuildCache, { CacheMetadata } from "../../buildCache.js";

function XanixResolveCacheDeps(
  metadata: CacheMetadata,
  entries: XanixClientEntry[],
): Plugin {
  return {
    name: "xanix:cached-deps",

    async resolveId(source) {
      if (source.startsWith(".") || path.isAbsolute(source)) {
        return null;
      }

      const dependency = metadata.get(source);
      if (dependency) {
        return { id: `/.xanix/cache/${dependency.file}`, external: true };
      }

      const buildCache = await BuildCache(entries);
      const newDependency = buildCache.get(source);
      if (newDependency) {
        return { id: `/.xanix/cache/${newDependency.file}`, external: true };
      }
    },
  };
}

export default XanixResolveCacheDeps;
