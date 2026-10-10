import pc from "picocolors";
import start from "./start/index.js";
import stop from "./stop.js";
import { getProcess } from "../include/process.js";
import { getFrameworkPackageJson } from "../include/utils.js";

const restart = async () => {
  const packageJson = await getFrameworkPackageJson();

  console.log("");
  console.log(pc.cyan(pc.bold(`Xanix ${packageJson.version}`)));
  console.log("");
  let activeProcess = await getProcess();
  if (!activeProcess) {
    console.log(`${pc.red("●")} ${pc.red("Failed to restart Xanix server.")}`);
    console.log("");
    console.log(pc.gray(`Run ${pc.cyan("xanix start")} to start the server.`));
    console.log("");
    return;
  }

  await stop({ restart: true });
  await start({ restart: true });
  activeProcess = await getProcess();
  console.log(`${pc.green("●")} Xanix server ${pc.green("restarted")}`);
  console.log(`  ${pc.gray("PID:")} ${activeProcess.pid}`);
  console.log("");
  console.log(
    `${pc.dim("Run")} ${pc.cyan("xanix stop")} ${pc.dim("to stop the server")}`,
  );
  console.log("");
};

export default restart;
