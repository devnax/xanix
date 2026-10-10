import pc from "picocolors";

import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

import { dumpFile, processDir } from "../include/process.js";
import { getFrameworkPackageJson } from "../include/utils.js";

const isAlive = (pid: unknown): pid is number => {
  if (!Number.isInteger(pid) || (pid as number) <= 0) {
    return false;
  }

  try {
    process.kill(pid as number, 0);
    return true;
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "EPERM"
    ) {
      return true;
    }

    return false;
  }
};

interface SavedApp {
  cwd: string;
  script: string;
}

// Persists every running Xanix server so `xanix resurrect` can restore them.
const save = async () => {
  const packageJson = await getFrameworkPackageJson();

  console.log("");
  console.log(pc.cyan(pc.bold(`Xanix ${packageJson.version}`)));
  console.log("");

  let entries;

  try {
    entries = await readdir(processDir, { withFileTypes: true });
  } catch {
    console.log(`${pc.red("✗")} No running Xanix servers to save.`);
    console.log("");
    console.log(pc.gray(`Run ${pc.cyan("xanix start")} first.`));
    console.log("");
    return;
  }

  const apps: SavedApp[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    try {
      const data: unknown = JSON.parse(
        await readFile(
          path.join(processDir, entry.name, "process.json"),
          "utf8",
        ),
      );

      if (
        typeof data !== "object" ||
        data === null ||
        !("pid" in data) ||
        !("cwd" in data) ||
        !("script" in data)
      ) {
        continue;
      }

      const record = data as {
        pid: unknown;
        cwd: unknown;
        script: unknown;
      };

      if (
        isAlive(record.pid) &&
        typeof record.cwd === "string" &&
        typeof record.script === "string" &&
        path.isAbsolute(record.cwd) &&
        path.isAbsolute(record.script)
      ) {
        apps.push({
          cwd: record.cwd,
          script: record.script,
        });
      }
    } catch {
      // No valid process file for this project.
    }
  }

  if (apps.length === 0) {
    console.log(`${pc.red("✗")} No running Xanix servers to save.`);
    console.log("");
    console.log(pc.gray(`Run ${pc.cyan("xanix start")} first.`));
    console.log("");
    return;
  }

  await mkdir(path.dirname(dumpFile), { recursive: true });
  await writeFile(dumpFile, JSON.stringify(apps, null, 2), "utf8");

  console.log(
    `${pc.green("✓")} Saved ${apps.length} server${apps.length > 1 ? "s" : ""}`,
  );

  for (const app of apps) {
    console.log(`  ${pc.dim(app.cwd)}`);
  }

  console.log("");
  console.log(pc.gray(`Dump file: ${dumpFile}`));
  console.log("");
};

export default save;
