#!/usr/bin/env node

import { Command } from "commander";
import dev from "./dev/index.js";
import build from "./build/index.js";
import start from "./start/index.js";
const program = new Command();

program.name("XANOS").description("Usages");
program.command("dev").description("run the development server").action(dev);
program.command("start").description("run the production server").action(start);

program
  .command("build")
  .description("build xanos for production")
  .option("--secure <boolean>", "enable secure build")
  .action(build);

program.parse();
