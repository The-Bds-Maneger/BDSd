#!/usr/bin/env node
import path from "node:path";
import os from "node:os";
import Yargs from "yargs";
import daemon from "./daemon"

const yargs = Yargs(process.argv.slice(2)).help().version(false).alias("h", "help").wrap(Yargs.terminalWidth()).command("daemon", "Start daemon and listen port and socket", yargs => {
  const options = yargs.option("port", {
    alias: "p",
    type: "number",
    description: "Port listen HTTP/HTTPs API"
  }).option("socket", {
    alias: "S",
    type: "string",
    description: "unix socket listen",
    default: path.join(os.tmpdir(), "bdsd.sock"),
  }).option("auth_key", {
    alias: "a",
    type: "boolean",
    description: "Enable auth to HTTP/HTTPs API",
    default: false,
  }).parseSync();
  return daemon({socket: options.socket, auth_key: options.auth_key, port: options.port});
}).command("server", "Maneger server in daemon", yargs => {
  return yargs.option("socket", {
    alias: "S",
    type: "string",
    description: "unix socket listen",
    default: path.join(os.tmpdir(), "bdsd.sock"),
  }).option("host", {
    alias: "H",
    type: "string",
    description: "HTTP/HTTPs host if unix socket not exists",
    default: "http://127.0.0.0:9074",
  }).command("install", "Download and Install server to folder", yargs => {
    const opts = yargs.option("version", {alias: "v", default: "latest"}).option("id", {alias: "i", type: "string", default: "default"}).option("platform", {demandOption: true}).parseSync();
    console.log(opts)
    return opts;
  }).parseAsync();
});

yargs.command({command: "*", handler: () => {yargs.showHelp();}}).parseAsync();