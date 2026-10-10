import pc from "picocolors";

import { spawn } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import path from "node:path";

import { dumpFile } from "../include/process.js";
import { getFrameworkPackageJson } from "../include/utils.js";

interface SavedApp {
  cwd: string;
  script: string;
}

const resurrect = async () => {
  const packageJson = await getFrameworkPackageJson();

  console.log("");
  console.log(pc.cyan(pc.bold(`Xanix ${packageJson.version}`)));
  console.log("");

  let apps: SavedApp[];

  try {
    const data: unknown = JSON.parse(await readFile(dumpFile, "utf8"));

    if (
      !Array.isArray(data) ||
      !data.every(
        (app) =>
          typeof app?.cwd === "string" && typeof app?.script === "string",
      )
    ) {
      throw new Error("Invalid saved process data");
    }

    apps = data;
  } catch {
    console.log(`${pc.red("✗")} No valid saved servers found.`);
    console.log("");
    console.log(
      pc.gray(`Run ${pc.cyan("xanix save")} to save running servers.`),
    );
    console.log("");
    return;
  }

  if (apps.length === 0) {
    console.log(`${pc.yellow("!")} No saved servers to restore.`);
    console.log("");
    return;
  }

  let restored = 0;

  for (const app of apps) {
    const cwd = path.resolve(app.cwd);

    try {
      await access(cwd);
    } catch {
      console.log(`${pc.red("✗")} ${cwd} ${pc.gray("(missing directory)")}`);
      continue;
    }

    if (!path.isAbsolute(app.script)) {
      console.log(`${pc.red("✗")} ${cwd} ${pc.gray("(invalid script path)")}`);
      continue;
    }

    try {
      await access(app.script);
    } catch {
      console.log(`${pc.red("✗")} ${cwd} ${pc.gray("(build entry missing)")}`);
      continue;
    }

    const child = spawn(process.execPath, [process.argv[1], "start"], {
      cwd,
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    });

    const result = await new Promise<boolean>((resolve) => {
      child.once("error", () => resolve(false));

      child.once("spawn", () => {
        child.unref();
        resolve(true);
      });
    });

    if (result) {
      restored++;
      console.log(`${pc.green("✓")} ${cwd}`);
    } else {
      console.log(`${pc.red("✗")} ${cwd} ${pc.gray("(failed to launch)")}`);
    }
  }

  console.log("");
  console.log(
    pc.gray(`Restoration requested for ${restored}/${apps.length} servers.`),
  );
  console.log("");
};

export default resurrect;
