import pc from "picocolors";
import { rm } from "node:fs/promises";
import { getProcess, processProjectDir } from "../include/process.js";
import spinner from "../include/spinner.js";

const stop = async (args: { restart?: boolean } = {}) => {
  const activeProcess = await getProcess();
  if (!activeProcess) {
    console.log(pc.yellow("Xanix server is not running."));
    return;
  }

  const pid = activeProcess.pid;

  if (!Number.isInteger(pid) || pid <= 0) {
    await rm(processProjectDir, {
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
    await rm(processProjectDir, {
      recursive: true,
      force: true,
    });

    console.log(pc.yellow("Xanix server is not running."));
    return;
  }

  if (!args.restart) {
    console.log("");
    console.log(`${pc.gray("●")} Xanix server ${pc.green("stopped")}`);
  }

  try {
    process.kill(pid, "SIGTERM");
  } catch {
    console.log(pc.red("Failed to stop Xanix server."));
    return;
  }
  const timeout = Date.now() + 5000;
  while (Date.now() < timeout) {
    try {
      process.kill(pid, 0);
    } catch {
      await rm(processProjectDir, {
        recursive: true,
        force: true,
      });
      if (!args.restart) {
        console.log(`  ${pc.gray("PID:")} ${activeProcess.pid}`);
        console.log("");
      }
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  console.log(pc.yellow("Xanix server did not stop gracefully."));
};

export default stop;
