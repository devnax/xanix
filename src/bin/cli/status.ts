import pc from "picocolors";
import { getProcess } from "../include/process.js";
const status = async () => {
  const activeProcess = await getProcess();

  if (!activeProcess) {
    console.log(`${pc.gray("●")} Xanix server ${pc.gray("stopped")}`);
    return;
  }

  const pid = activeProcess.pid;

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
