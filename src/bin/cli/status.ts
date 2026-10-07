import pc from "picocolors";
import { readFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { xanixProcesses } from "../include/path.js";

const status = async () => {
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
    console.log(`${pc.gray("●")} Xanix server ${pc.gray("stopped")}`);

    return;
  }

  if (!Number.isInteger(pid) || pid <= 0) {
    console.log(`${pc.gray("●")} Xanix server ${pc.gray("stopped")}`);

    return;
  }

  try {
    process.kill(pid, 0);

    console.log(`${pc.green("●")} Xanix server ${pc.green("running")}`);

    console.log(`  ${pc.gray("PID:")} ${pid}`);
  } catch {
    console.log(`${pc.gray("●")} Xanix server ${pc.gray("stopped")}`);
  }
};

export default status;
