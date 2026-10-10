import { spawn } from "child_process";
import pc from "picocolors";
import { mkdir, open, writeFile } from "fs/promises";
import path from "path";
import outdirs from "../../../outdirs.js";
import { getFrameworkPackageJson } from "../../include/utils.js";
import {
  processFiles,
  getProcess,
  processProjectDir,
} from "../../include/process.js";
import startExternal from "./external.js";

const start = async (args: { external?: boolean; restart?: boolean }) => {
  const isExternal = args.external ?? false;
  const packageJson = await getFrameworkPackageJson();

  if (!args.restart) {
    console.log("");
    console.log(pc.cyan(pc.bold(`Xanix ${packageJson.version}`)));
    console.log("");
  }

  if (isExternal) {
    startExternal();
    return;
  }

  await mkdir(processProjectDir, {
    recursive: true,
  });

  const filePath = path.join(outdirs.server, "index.js");
  const files = processFiles;
  const processFile = files.process;
  const stdoutFile = files.logs.stdout;
  const stderrFile = files.logs.stderr;
  const oldProcess = await getProcess();
  if (oldProcess) {
    const oldPid = Number(oldProcess?.pid);
    console.log(pc.yellow(`Xanix server is already running (${oldPid})`));
    return;
  }

  // Create/open log files.
  const stdout = await open(stdoutFile, "a");
  const stderr = await open(stderrFile, "a");
  const child = spawn(process.execPath, [filePath], {
    detached: true,
    stdio: ["ignore", stdout.fd, stderr.fd, "ipc"],
    env: {
      ...process.env,
      NODE_ENV: "production",
    },
  });

  // The parent no longer needs these handles.
  await stdout.close();
  await stderr.close();

  if (!child.pid) {
    console.error(pc.red("Failed to start Xanix server."));
    return;
  }

  await writeFile(
    processFile,
    JSON.stringify(
      {
        pid: child.pid,
        cwd: process.cwd(),
        script: filePath,
        startedAt: Date.now(),
      },
      null,
      2,
    ),
  );

  child.on("message", (message: { type?: string; url?: string }) => {
    if (message.type === "xanix:ready") {
      if (!args.restart) {
        console.log(`  ${pc.blue("➜ Local:")} ${pc.yellow(message.url ?? "")}`);
        console.log("");
      }
      child.disconnect();
      child.unref();
    }
  });

  child.on("error", (error) => {
    console.error(pc.red("Failed to start Xanix server"), error);
    // write error to stderr log
    writeFile(stderrFile, String(error), { flag: "a" }).catch(() => {});
  });

  child.unref();
};

export default start;
