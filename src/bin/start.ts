import { spawn } from "child_process";
import pc from "picocolors";
import path from "path";
import outdirs from "../include/outdirs.js";
import { getFrameworkPackageJson } from "../include/utils.js";

const start = async () => {
  const packageJson = await getFrameworkPackageJson();

  console.log("");
  console.log(pc.cyan(pc.bold(`Xanix ${packageJson.version}`)));
  console.log("");
  const filePath = path.join(outdirs.server, "index.js");
  const child = spawn(process.execPath, [filePath], {
    stdio: ["inherit", "inherit", "inherit", "ipc"],
  });
  child.on("message", (message: { type?: string; url?: string }) => {
    if (message.type === "xanix:ready") {
      console.log(`  ${pc.blue("➜ Local:")} ${pc.yellow(message.url ?? "")}`);
      console.log("");
      console.log(pc.gray("Press Ctrl+C to stop"));
      console.log("");
    }
  });

  child.on("error", (error) => {
    console.error(pc.red("Failed to start Xanix server"), error);
  });
};

export default start;
