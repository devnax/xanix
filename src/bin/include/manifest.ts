import path from "node:path";
import fs from "node:fs";
import { XanixClientEntry } from "../types.js";
import outdirs from "../../outdirs.js";

let manifest: XanixClientEntry[] = [];

export const createManifest = async (entries: XanixClientEntry[]) => {
  manifest = entries;
  // const outDir = path.resolve(process.cwd(), outdirs.root);
  // fs.writeFileSync(
  //   path.resolve(outDir, "client-manifest.json"),
  //   JSON.stringify(entries, null, 2),
  // );
};

export const getManifest = async (): Promise<XanixClientEntry[]> => {
  return manifest;

  // const manifestPath = path.resolve(
  //   process.cwd(),
  //   outdirs.root,
  //   "client-manifest.json",
  // );
  // console.log(manifestPath);

  // if (fs.existsSync(manifestPath)) {
  //   const content = await fs.promises.readFile(manifestPath, "utf-8");
  //   return JSON.parse(content);
  // }
  // return [];
};
