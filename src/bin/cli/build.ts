import buildServer from "../bundler/server/build.js";
import buildClient from "../bundler/client/build.js";
import pc from "picocolors";
import spinner from "../include/spinner.js";
import { getFrameworkPackageJson, normalizePath } from "../include/utils.js";
import outdirs from "../../outdirs.js";
import fs from "node:fs";

const build = async (rootEntry: string) => {
  fs.rmSync(outdirs.root, {
    recursive: true,
    force: true,
  });

  fs.mkdirSync(outdirs.root, {
    recursive: true,
  });

  const packageJson = await getFrameworkPackageJson();

  console.log("");
  console.log(pc.cyan(pc.bold(`Xanix ${packageJson.version}`)));
  console.log("");

  spinner.start("Building server...");

  const st = Date.now();

  await buildServer({
    rootEntry,
    onBuildEnd: async () => {
      spinner.stop(
        `${pc.green("✓")} Server built in ${pc.dim(Date.now() - st + "ms")}`,
      );

      spinner.start("Building client...");

      const clientStart = Date.now();
      const clientEntries = await buildClient();
      const clientDuration = Date.now() - clientStart;

      spinner.stop(
        `${pc.green("✓")} Client built in ${pc.dim(clientDuration + "ms")}`,
      );

      if (clientEntries.length > 0) {
        console.log("");
        console.log(pc.bold(`Pages (${clientEntries.length})`));

        for (const entry of clientEntries) {
          const filepath = entry.resolved.replace(
            normalizePath(process.cwd()) + "/",
            "",
          );
          console.log(
            `  ${pc.green("○")} ${pc.cyan(entry.id)} ${pc.dim(filepath)}`,
          );
        }
      }

      const duration = Date.now() - st;

      console.log("");
      console.log(pc.bold(pc.green(`Build completed in ${duration}ms`)));
      console.log("");
      console.log(
        `${pc.dim("Run")} ${pc.cyan("xanix start")} ${pc.dim(
          "to start the server",
        )}`,
      );
      console.log("");
    },
  });
};

export default build;
