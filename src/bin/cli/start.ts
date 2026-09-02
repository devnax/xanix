import path from "node:path";
import { spawn } from "child_process";
import outdirs from "../../outdirs.js";
let child: any;

const start = async () => {
  const filePath = path.join(outdirs.server, "index.js");
  child = spawn(process.execPath, [filePath], {
    stdio: "inherit",
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
