import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const sourceTypes = path.join(root, "src", "types");
const dist = path.join(root, "dist");
const distTypes = path.join(dist, "types");
const indexDts = path.join(dist, "index.d.ts");

// 1. Copy types/
fs.cpSync(sourceTypes, distTypes, {
  recursive: true,
  force: true,
});

console.log("✓ Copied src/types → dist/types");

// 2. Add references to dist/index.d.ts
if (!fs.existsSync(indexDts)) {
  throw new Error(`Cannot find ${indexDts}`);
}

const references = [
  '/// <reference path="./types/globals.d.ts" />',
  '/// <reference path="./types/express.d.ts" />',
  '/// <reference path="./types/assets.d.ts" />',
].join("\n");

let content = fs.readFileSync(indexDts, "utf8");

// Remove existing references first
content = content.replace(
  /^\/\/\/ <reference path="\.\/types\/(?:globals|express|assets)\.d\.ts" \/>\r?\n?/gm,
  "",
);

// Add references at the beginning
content = `${references}\n\n${content.trimStart()}`;

fs.writeFileSync(indexDts, content, "utf8");

console.log("✓ Added Xanix type references");
