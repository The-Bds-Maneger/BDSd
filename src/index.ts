#!/usr/bin/env node
import path from "node:path";
import os from "node:os";
import { createInterface as readline } from "node:readline";
import Yargs from "yargs";
import daemon from "./daemon";
import  * as bdsCore from "@the-bds-maneger/core";

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
  process.title = `Minecraft Server Deamon, socket: ${options.socket}${options.port?", Port: "+options.port:""}`;
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
  }).command("install", "Download and Install server to folder", async yargs => {
    const opts = yargs.option("version", {alias: "v", default: "latest"}).option("id", {alias: "i", type: "string", default: "default"}).option("platform", {demandOption: true}).parseSync();
    const request = (url: string) => bdsCore.httpRequest.getJSON(url, {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({platform: opts.platform, version: opts.version, platformOptions: {id: opts.id}})});
    return request(`http://unix:${opts.socket}:/install`).catch(() => request(`${opts.host}/install`)).then((data: {id: string, version: string, date: string, url: string}) => {
      const releaseDate = new Date(data.date),
        day = releaseDate.getDay()>9?releaseDate.getDay().toFixed(0):"0"+releaseDate.getDay(),
        month = (releaseDate.getMonth()+1)>9?(releaseDate.getMonth()+1).toFixed(0):"0"+(releaseDate.getMonth()+1)
      ;
      console.log("Platform ID: %s\n\tVersion: %s, Release date: %s/%s/%s", data.id, data.version, day, month, releaseDate.getFullYear());
    });
  }).command("start", "Start minecraft server", async yargs => {
    const options = yargs.option("id", {type: "string", default: "default"}).option("platform", {demandOption: true, type: "string"}).option("interactive", {
      alias: "i",
      type: "boolean",
      default: false,
      description: "Send commands to server"
    }).option("tty", {
      alias: "t",
      type: "boolean",
      default: false,
      description: "Show log"
    }).option("stopOnClose", {
      alias: "n",
      default: true,
      type: "boolean",
      description: "If interactive (-i) stop server if press ctrl+c (close server)"
    }).parseSync();
    const request = (url: string) => bdsCore.httpRequest.getJSON(url, {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({platform: options.platform, version: options.version, platformOptions: {id: options.id}})});
    return request(`${options.host}/`).catch(() => request(`http://unix:${options.socket}:/`)).then(({id}) => {
      console.log("Server ID: %s", id);
      if (options.tty) console.warn("Not yet implemented!");
      if (options.interactive) {
        const sendCommand = (url: string, commands: any) => bdsCore.httpRequest.getJSON(url, {method: "PUT", headers: {"Content-Type": "application/json"}, body: JSON.stringify({id, commands})});
        const requestStop = (url: string) => bdsCore.httpRequest.getJSON(url, {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({id})});
        const line = readline({input: process.stdin, output: process.stdout});
        line.on("line", data => sendCommand(`http://unix:${options.socket}:/`, data).catch(() => sendCommand(`${options.host}/`, data)));
        if (options.stopOnClose) {
          line.once("SIGINT", () => requestStop(`http://unix:${options.socket}:/stop`).catch(() => requestStop(`${options.host}/stop`)).then(() => line.close()));
          line.once("SIGCONT", () => requestStop(`http://unix:${options.socket}:/stop`).catch(() => requestStop(`${options.host}/stop`)).then(() => line.close()));
          line.once("SIGTSTP", () => requestStop(`http://unix:${options.socket}:/stop`).catch(() => requestStop(`${options.host}/stop`)).then(() => line.close()));
        }
      }
    });
  }).command("attach", "attach to runnnig server", async yargs => {
    const options = yargs.option("stopOnClose", {
      alias: "n",
      default: true,
      type: "boolean",
      description: "Stop server if press ctrl+c (close server)"
    }).parseSync();
    return options;
  }).command("stop", "Stop server if not infomed IDs stop all", async yargs => {
    const options = yargs.parseSync();
    const [,, ...ids] = options._;
    const requestStop = (id?: string) => bdsCore.httpRequest.getJSON(`${options.host}/stop${id?"":"/all"}`, {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({id})}).catch(() => bdsCore.httpRequest.getJSON(`http://unix:${options.socket}:/stop${id?"":"/all"}`, {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({id})}));
    if (ids.length === 0) return requestStop().then((data: {id: string, exitCode: number}[]) => data.forEach(data => console.log("Server ID: %s\n\tCode Exit: %f", data.id, data.exitCode)));
    else return Promise.all(ids.map((id: string) => requestStop(id).then(console.log).catch(console.error)));
  }).parseAsync();
}).command("local", "Run server localy", async yargs => {
  return yargs.parseAsync();
});

yargs.command({command: "*", handler: () => {yargs.showHelp();}}).parseAsync();