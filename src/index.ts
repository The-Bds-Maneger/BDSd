#!/usr/bin/env node
import Yargs from "yargs";
import { daemon_main } from "./cmd/daemon/main";
import { local_main } from "./cmd/local/main";

Yargs(process.argv.slice(2)).help().version(false).alias("h", "help").wrap(Yargs.terminalWidth()).demandCommand()
.command("server", "Maneger server in daemon", daemon_main)
.command("local", "Run server localy", local_main).parseAsync().catch((err) => {
  console.error("Error: %s", err?.message||err);
  if (err?.options?.body) {
    console.error("Error:", err?.options?.body);
  }
  process.exit(1);
});