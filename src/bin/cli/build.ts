import buildServer from "../bundler/buildServer.js";
import buildClient from "../bundler/buildClient.js";
import pc from "picocolors";
import logger from "../include/logger.js";

const build = async (rootEntry: string) => {
  logger.info(pc.green("Building server..."), "server");
  const st = Date.now();
  await buildServer({
    rootEntry,
    onBuildEnd: async (entries) => {
      logger.info(pc.green("Building client..."), "client");
      const duration = Date.now() - st;
      if (entries.length) {
        await buildClient(entries);
      }
      logger.info(pc.green(`Build completed in ${duration}ms`), "complete");
    },
  });
};

export default build;
