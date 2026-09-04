import path from "node:path";
import { tsconfigPathsMatcher } from "../plugins/XanixTsconfigAlias.js";

export default function external(id: string): boolean {
  if (
    id.startsWith(".") ||
    path.isAbsolute(id) ||
    id.startsWith("xanix") ||
    id === "virtual:xanix-document" ||
    tsconfigPathsMatcher(id)
  ) {
    return false;
  }
  return true;
}
