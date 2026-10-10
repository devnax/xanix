import pc from "picocolors";
import { rm } from "node:fs/promises";
import { getProcess, processProjectDir } from "../include/process.js";
import { getFrameworkPackageJson } from "../include/utils.js";

const notRunningLog = (restart?: boolean) => {
  if (restart) {
    console.log(` ${pc.red("✗")} Xanix server is not running`);
    console.log("");
    return;
  }
  console.log(` ${pc.red("✗")} Xanix server is not running`);
  console.log("");
  console.log(pc.gray(` Run ${pc.cyan("xanix start")} to start the server.`));
  console.log("");
};

const stop = async (args: { restart?: boolean } = {}) => {
  const packageJson = await getFrameworkPackageJson();

  if (!args.restart) {
    console.log("");
    console.log(pc.cyan(pc.bold(`Xanix ${packageJson.version}`)));
  }

  const activeProcess = await getProcess();
  if (!activeProcess) {
    notRunningLog(args.restart);
    return;
  }

  const pid = activeProcess.pid;

  if (!Number.isInteger(pid) || pid <= 0) {
    await rm(processProjectDir, {
      recursive: true,
      force: true,
    });
    notRunningLog(args.restart);
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

    notRunningLog(args.restart);

    return;
  }

  if (!args.restart) {
    console.log("");
    console.log(` ${pc.gray("●")} Xanix server ${pc.green("stopped")}`);
  }

  try {
    process.kill(pid, "SIGTERM");
  } catch {
    console.log("");
    console.log(` ${pc.red("✗")} ${pc.red("Failed to stop Xanix server.")}`);
    console.log(` ${pc.gray(`PID:`)}${pid}`);
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
        console.log(`  ${pc.gray("PID:")} ${pid}`);
        console.log("");
        console.log(
          pc.gray(` Run ${pc.cyan("xanix start")} to start the server.`),
        );
        console.log("");
      }
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  console.log(pc.yellow("Xanix server did not stop gracefully."));
};

export default stop;
