import path from "path";
import fs from "fs";
import { ClientEntry } from "./clientDetector";

async function generateClientEntry(generatedDir: string, entry: ClientEntry) {
  const fileName = `${entry.component}.tsx`;

  const file = path.resolve(generatedDir, fileName);

  const componentPath = entry.importer.replaceAll("\\", "/");

  const code = `
import { hydrateRoot } from "react-dom/client";
import Component from ${JSON.stringify(componentPath)};

const root = document.getElementById("root");

if (root) {
  hydrateRoot(
    root,
    <Component />,
  );
}
`;

  await fs.promises.writeFile(file, code, "utf8");

  return file;
}

export default generateClientEntry;
