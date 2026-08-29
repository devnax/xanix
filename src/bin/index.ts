#!/usr/bin/env node

import { Command } from "commander";
import dev from "./cli/dev.js";
import start from "./cli/start.js";

const program = new Command();

program
  .name("xanix")
  .description("Xanix application CLI")
  .argument("[entry]", "entry file")
  .option("--watch", "watch for file changes")
  .action(async (entry, options) => {
    entry = entry ?? "index.tsx";
    let watch = options.watch ?? false;

    if (watch) {
      await dev(entry);
    } else {
      // await start(entry);
    }
  });

program.parseAsync();
