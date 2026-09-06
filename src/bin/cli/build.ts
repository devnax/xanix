import buildServer from "../bundler/buildServer.js";
import buildClient from "../bundler/buildClient.js";
import pc from "picocolors";
import spinner from "../include/spinner.js";
import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageJson = JSON.parse(
  await readFile(path.join(__dirname, "../../../package.json"), "utf8"),
);

const build = async (rootEntry: string) => {
  console.log("");
  console.log(pc.bold(`Xanix ${packageJson.version}`));
  console.log("");
  spinner.start(`Building server...`);
  const st = Date.now();
  await buildServer({
    rootEntry,
    onBuildEnd: async (entries) => {
      spinner.stop(
        `${pc.green("✓")} Server built in ${pc.dim(Date.now() - st + "ms")}`,
      );
      spinner.start(`Building client...`);
      const duration = Date.now() - st;
      await buildClient(entries);
      spinner.stop(
        `${pc.green("✓")} Client built in ${pc.dim(duration + "ms")}`,
      );
      console.log("");
      console.log(pc.bold(pc.green(`Build completed in ${duration}ms`)));
      console.log("");
      console.log(
        `${pc.dim("Run")} ${pc.cyan("xanix start")} ${pc.dim("to start the server")}`,
      );
      console.log("");
    },
  });
};

export default build;
