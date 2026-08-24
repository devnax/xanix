import path from "node:path";
import fs from "node:fs";
import { ClientManifest, XanixClientEntry } from "../types.js";
let readedManifest: ClientManifest | null = null;

export const createManifest = async (entries: XanixClientEntry[]) => {
  const manifest: ClientManifest = {
    id: `id_`,
    entries: [...entries.values()],
  };
  readedManifest = manifest;
  const outputDir = path.resolve(process.cwd(), ".xanix");
  fs.writeFileSync(
    path.resolve(outputDir, "client-manifest.json"),
    JSON.stringify(manifest, null, 2),
  );
};

export const readManifest = async (): Promise<ClientManifest | null> =>
  readedManifest;
