import pc from "picocolors";
import start from "./start/index.js";
import stop from "./stop.js";
import { getProcess } from "../include/process.js";
import spinner from "../include/spinner.js";

const restart = async () => {
  console.log("");
  spinner.start(`${pc.green("●")} Xanix server ${pc.green("restarting")}`);
  await stop({ restart: true });
  await start({ restart: true });
  const activeProcess = await getProcess();
  spinner.stop(`${pc.green("●")} Xanix server ${pc.green("restarted")}`);
  console.log(`  ${pc.gray("PID:")} ${activeProcess.pid}`);
  console.log("");
};

export default restart;
