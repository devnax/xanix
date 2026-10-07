import pc from "picocolors";
import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { xanixProcesses } from "../include/path.js";

const stop = async () => {
  const projectId = crypto
    .createHash("sha256")
    .update(process.cwd())
    .digest("hex")
    .slice(0, 16);

  const processDir = path.join(xanixProcesses, projectId);

  const pidFile = path.join(processDir, "pid");

  let pid: number;

  try {
    pid = Number(await readFile(pidFile, "utf8"));
  } catch {
    console.log(pc.yellow("Xanix server is not running."));

    return;
  }

  if (!Number.isInteger(pid) || pid <= 0) {
    await rm(processDir, {
      recursive: true,
      force: true,
    });

    console.log(pc.yellow("Xanix server is not running."));

    return;
  }

  // Check whether the process actually exists.
  try {
    process.kill(pid, 0);
  } catch {
    await rm(processDir, {
      recursive: true,
      force: true,
    });

    console.log(pc.yellow("Xanix server is not running."));

    return;
  }

  console.log(`${pc.blue("➜")} Stopping Xanix server ${pc.gray(`(${pid})`)}`);

  try {
    process.kill(pid, "SIGTERM");
  } catch {
    console.log(pc.red("Failed to stop Xanix server."));

    return;
  }

  // Wait until the process actually exits.
  const timeout = Date.now() + 5000;

  while (Date.now() < timeout) {
    try {
      process.kill(pid, 0);
    } catch {
      await rm(processDir, {
        recursive: true,
        force: true,
      });

      console.log(`${pc.green("✓")} Xanix server stopped`);

      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  console.log(pc.yellow("Xanix server did not stop gracefully."));
};

export default stop;
