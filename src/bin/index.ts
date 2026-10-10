#!/usr/bin/env node

import { Command } from "commander";

import dev from "./cli/dev/index.js";
import build from "./cli/build.js";
import start from "./cli/start/index.js";
import stop from "./cli/stop.js";
import restart from "./cli/restart.js";
import status from "./cli/status.js";
import logs from "./cli/logs.js";
import startup from "./cli/startup.js";
import save from "./cli/save.js";
import resurrect from "./cli/resurrect.js";

const program = new Command();

program.name("xanix").description("Xanix application CLI");

program
  .command("dev")
  .description("Start the Xanix development server")
  .argument("[entry]", "entry file", "index.tsx")
  .action(async (entry) => {
    await dev(entry);
  });

program
  .command("build")
  .description("Build the Xanix application")
  .argument("[entry]", "entry file", "index.tsx")
  .action(async (entry) => {
    await build(entry);
  });

program
  .command("start")
  .description("Start the production server")
  .option("--external", "start the server in external mode")
  .action(start);

program.command("stop").description("Stop the production server").action(stop);
program
  .command("restart")
  .description("Restart the production server")
  .action(restart);

program
  .command("status")
  .description("Check the status of the production server")
  .action(status);

program
  .command("logs")
  .description("View the logs of the production server")
  .action(logs);

program
  .command("startup")
  .description("Generate a startup script to restore servers on boot")
  .action(startup);

program
  .command("save")
  .description("Save running servers to restore them on boot")
  .action(save);

program
  .command("resurrect")
  .description("Restart the servers stored by save")
  .action(resurrect);

await program.parseAsync();
