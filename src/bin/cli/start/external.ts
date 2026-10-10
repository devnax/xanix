import path from "path";
import outdirs from "../../../outdirs.js";
import { spawn } from "child_process";
import pc from "picocolors";

const startExternal = async () => {
  const filePath = path.join(outdirs.server, "index.js");
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
};

export default startExternal;
