import os from "node:os";
import path from "node:path";

const homeDir = os.homedir();

export const xanixHome = (() => {
  if (process.platform === "win32") {
    return path.join(
      process.env.LOCALAPPDATA || path.join(homeDir, "AppData", "Local"),
      "Xanix",
    );
  }
  if (process.platform === "darwin") {
    return path.join(homeDir, "Library", "Application Support", "Xanix");
  }

  return path.join(
    process.env.XDG_STATE_HOME || path.join(homeDir, ".local", "state"),
    "xanix",
  );
})();

export const xanixProcesses = path.join(xanixHome, "processes");
export const xanixLogs = path.join(xanixHome, "logs");
