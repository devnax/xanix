import { spawn } from "child_process";
import pc from "picocolors";
import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageJson = JSON.parse(
  await readFile(path.join(__dirname, "../../../package.json"), "utf8"),
);
import outdirs from "../../outdirs.js";
let child: any;

const start = async () => {
  console.log("");
  console.log(pc.bold(`Xanix ${packageJson.version}`));
  console.log("");

  const filePath = path.join(outdirs.server, "index.js");
  child = spawn(process.execPath, [filePath], {
    stdio: ["inherit", "inherit", "inherit", "ipc"],
  });

  child.on("message", async (message: any) => {
    if (message.type === "xanix:ready") {
      const url = message.url;
      console.log(`  ${pc.blue("➜ Local:")} ${pc.yellow(url)}`);
      console.log("");
    }
  });

  process.on("SIGINT", () => {
    child?.kill();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    child?.kill();
    process.exit(0);
  });
};

export default start;
