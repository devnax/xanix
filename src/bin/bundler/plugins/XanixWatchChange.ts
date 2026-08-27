import { Plugin } from "rollup";
import { XanixClientEntry } from "../../types";
import path from "path";
import { createManifest, readManifest } from "../../include/manifest.js";
import generateClientEntries from "../generateClientEntries.js";
import { entriesEqual } from "../../include/entry.js";

export type XanixWatchChangeOptions = {
  onClientEntryChange?: (
    entry: string,
    entries: XanixClientEntry[],
  ) => Promise<void>;
  onServerChange?: (
    entry: string,
    entries: XanixClientEntry[],
  ) => Promise<void>;
  onChange?: (
    entry: string,
    event: "update" | "delete" | "create" | undefined,
  ) => void;
};

const XanixWatchChange = (
  entries: XanixClientEntry[],
  options: XanixWatchChangeOptions,
): Plugin => {
  return {
    name: "xanix-watch-server",
    async watchChange(id, change) {
      const entry = path.resolve(id).replaceAll("\\", "/");
      const manifest = await readManifest();
      if (!manifest) return;
      const isClientEntry = Array.from(manifest.entries.values()).find(
        (e) => e.file === entry,
      );

      if (!isClientEntry) {
        const entries = await generateClientEntries();
        const isEqual = await entriesEqual(entries);
        if (!isEqual) {
          await createManifest(entries);
          await options.onClientEntryChange?.(entry, entries);
        }

        await options.onServerChange?.(entry, entries);
      }

      options.onChange?.(entry, change?.event);
    },
  };
};

export default XanixWatchChange;
