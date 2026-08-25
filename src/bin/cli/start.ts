import buildServer from "../bundler/buildServer.js";
import buildClient from "../bundler/buildClient.js";
import pc from "picocolors";
import path from "node:path";
const root = process.cwd();
import logger from "../include/logger.js";
import { spawn } from "child_process";
let child: any;

const build = async (rootEntry: string) => {
  logger.info(pc.green("Building server..."), "server");
  const startTime = Date.now();
  await buildServer({
    rootEntry,
    onBuildEnd: async (entries) => {
      logger.info(pc.green("Building client..."), "client");
      const duration = Date.now() - startTime;
      await buildClient(entries);
      logger.info(pc.green(`Build completed in ${duration}ms`), "complete");
    },
  });
  // const filePath = path.join(root, ".xanix", "index.js");
  // child = spawn(process.execPath, [filePath], {
  //   stdio: "inherit",
  // });

  // process.on("SIGINT", () => {
  //   child?.kill();
  //   process.exit(0);
  // });

  // process.on("SIGTERM", () => {
  //   child?.kill();
  //   process.exit(0);
  // });
};

export default build;
