import path from "node:path";
import fs from "node:fs";
import { ClientManifest, XanixClientEntry } from "../types.js";
import outdirs from "../../outdirs.js";

export const createManifest = async (entries: XanixClientEntry[]) => {
  // const manifest: ClientManifest = {
  //   id: `id_`,
  //   entries: [...entries.values()],
  // };
  // readedManifest = manifest;
  // const outDir = path.resolve(process.cwd(), outdirs.root);
  // fs.writeFileSync(
  //   path.resolve(outDir, "client-manifest.json"),
  //   JSON.stringify(manifest, null, 2),
  // );
};

export const readManifest = async (): Promise<ClientManifest | void> => {
  const manifestPath = path.resolve(
    process.cwd(),
    outdirs.server,
    "client-manifest.json",
  );
  if (fs.existsSync(manifestPath)) {
    const content = await fs.promises.readFile(manifestPath, "utf-8");
    return JSON.parse(content);
  }
  return {
    id: `id_`,
    entries: [],
  };
};

export const getEntries = async (): Promise<XanixClientEntry[]> => {
  const manifest = await readManifest();
  if (!manifest) {
    return [];
  }
  return manifest.entries;
};
