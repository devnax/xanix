import fs from "node:fs/promises";
import path from "node:path";
import outdirs from "../../outdirs";

interface XanixManifestEntry {
  id: string;
  name: string;
  file: string;
  path: string;
  build: string;
  export: string;
}

interface XanixManifest {
  version: number;
  entries: XanixManifestEntry[];
}

async function readManifest(): Promise<XanixManifest> {
  const manifestPath = path.resolve(
    process.cwd(),
    outdirs.root,
    "client-manifest.json",
  );

  const source = await fs.readFile(manifestPath, "utf8");
  return JSON.parse(source) as XanixManifest;
}

export default readManifest;
