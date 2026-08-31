#!/usr/bin/env node

import { Command } from "commander";

import dev from "./cli/dev.js";
import build from "./cli/build.js";
import start from "./cli/start.js";

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
  .action(start);

await program.parseAsync();
