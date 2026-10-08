import { spawn } from "child_process";
import pc from "picocolors";
import { mkdir, open, readFile, writeFile } from "fs/promises";
import { fileURLToPath } from "url";
import path from "path";
import crypto from "crypto";
import outdirs from "../../outdirs.js";
import { xanixProcesses, xanixLogs } from "../include/path.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageJson = JSON.parse(
  await readFile(path.join(__dirname, "../../../package.json"), "utf8"),
);

const start = async (args: { wait?: boolean }) => {
  const isWait = args.wait ?? false;

  console.log("");
  console.log(pc.cyan(pc.bold(`Xanix ${packageJson.version}`)));
  console.log("");

  const filePath = path.join(outdirs.server, "index.js");

  if (isWait) {
    const child = spawn(process.execPath, [filePath], {
      stdio: ["inherit", "inherit", "inherit", "ipc"],
    });
    child.on("message", (message: { type?: string; url?: string }) => {
      if (message.type === "xanix:ready") {
        console.log(`  ${pc.blue("➜ Local:")} ${pc.yellow(message.url ?? "")}`);
        console.log("");
      }
    });

    child.on("error", (error) => {
      console.error(pc.red("Failed to start Xanix server"), error);
    });
    return;
  }

  const projectId = crypto
    .createHash("sha256")
    .update(process.cwd())
    .digest("hex")
    .slice(0, 16);

  const processDir = path.join(xanixProcesses, projectId);
  const logDir = path.join(xanixLogs, projectId);

  await mkdir(processDir, {
    recursive: true,
  });

  await mkdir(logDir, {
    recursive: true,
  });

  const pidFile = path.join(processDir, "pid");
  const processFile = path.join(processDir, "process.json");
  const stdoutFile = path.join(logDir, "stdout.log");
  const stderrFile = path.join(logDir, "stderr.log");

  // Check if already running.
  try {
    const oldPid = Number(await readFile(pidFile, "utf8"));
    process.kill(oldPid, 0);
    console.log(pc.yellow(`Xanix server is already running (${oldPid})`));
    return;
  } catch {
    // Not running.
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

  await writeFile(pidFile, String(child.pid));
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
      console.log(`  ${pc.blue("➜ Local:")} ${pc.yellow(message.url ?? "")}`);
      console.log("");
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
