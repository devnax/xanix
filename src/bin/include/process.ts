import os from "node:os";
import path from "node:path";
import { mkdir, readFile } from "fs/promises";
import crypto from "crypto";

export const processDir = (() => {
  const homeDir = os.homedir();
  const paths: any = {
    win32: path.join(
      process.env.LOCALAPPDATA || path.join(homeDir, "AppData", "Local"),
      "Xanix",
    ),
    darwin: path.join(homeDir, "Library", "Application Support", "Xanix"),
    linux: path.join(
      process.env.XDG_STATE_HOME || path.join(homeDir, ".local", "state"),
      "xanix",
    ),
  };
  return paths[process.platform] || paths.linux;
})();

export const dumpFile = path.join(processDir, "dump.json");

export const projectId = crypto
  .createHash("sha256")
  .update(process.cwd())
  .digest("hex")
  .slice(0, 16);

export const processProjectDir = path.join(processDir, projectId);

export const processFiles = {
  process: path.join(processProjectDir, "process.json"),
  logs: {
    stdout: path.join(processProjectDir, "stdout.log"),
    stderr: path.join(processProjectDir, "stderr.log"),
  },
};

await mkdir(processDir, {
  recursive: true,
});

export const getProcess = async () => {
  try {
    const data = await readFile(processFiles.process, "utf8");
    return JSON.parse(data ?? "{}");
  } catch {
    return null;
  }
};
