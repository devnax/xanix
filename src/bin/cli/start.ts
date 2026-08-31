import buildServer from "../bundler/buildServer.js";
import buildClient from "../bundler/buildClient.js";
import pc from "picocolors";
import path from "node:path";
import logger from "../include/logger.js";
import { spawn } from "child_process";
import { outDir } from "../bundler/config/output.js";
let child: any;

const start = async () => {
  const filePath = path.join(outDir.server, "index.js");
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
