import { XanixClientEntry } from "../types";
import { readManifest } from "./manifest.js";

export const entriesEqual = async (entries: XanixClientEntry[]) => {
  const manifest = await readManifest();
  if (!manifest) {
    return false;
  }
  if (manifest.entries.length !== entries.length) {
    return false;
  }
  for (const entry of manifest.entries) {
    const existingEntry = entries.find((e) => e.id === entry.id);
    if (!existingEntry) {
      return false;
    }
    if (
      existingEntry.name !== entry.name ||
      existingEntry.file !== entry.file
    ) {
      return false;
    }
  }

  return true;
};
