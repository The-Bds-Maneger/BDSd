#!/usr/bin/env node
import { createInterface as readline } from "node:readline";
import * as bdsCore from "@the-bds-maneger/core";
import utils from "node:util";
import path from "node:path";
import os from "node:os";
import Yargs from "yargs";
import daemon from "./daemon";
import cliColors from "cli-color";

function installUpdateMessage(data: {date: Date, id?: string, version: string, url?: string, isUpdate?: boolean}) {
  const releaseDate = new Date(data?.date), day = releaseDate.getDay()>9?releaseDate.getDay().toFixed(0):"0"+releaseDate.getDay(), month = (releaseDate.getMonth()+1)>9?(releaseDate.getMonth()+1).toFixed(0):"0"+(releaseDate.getMonth()+1);
  if (data?.isUpdate) console.log("Update Platform ID: %s\n\tVersion: %s, Release date: %s/%s/%s", data?.id, data?.version, day, month, releaseDate.getFullYear());
  else console.log("Install Platform ID: %s\n\tVersion: %s, Release date: %s/%s/%s", data?.id, data?.version, day, month, releaseDate.getFullYear());
}

const yargs = Yargs(process.argv.slice(2)).help().version(false).alias("h", "help").wrap(Yargs.terminalWidth()).command("daemon", "Start daemon and listen port and socket", yargs => {
  const options = yargs.option("port", {
    alias: "p",
    type: "number",
    description: "Port listen HTTP/HTTPs API"
  }).option("socket", {
    alias: "S",
    type: "string",
    description: "unix socket listen",
    default: process.env.BDSD_SOCKET?path.resolve(process.env.BDSD_SOCKET):path.join(os.tmpdir(), "bdsd.sock"),
  }).option("auth_key", {
    alias: "a",
    type: "boolean",
    description: "Enable auth to HTTP/HTTPs API",
    default: false,
  }).option("chmod", {
    alias: "c",
    type: "string",
    default: "a+rw"
  }).parseSync();
  process.title = `Minecraft Server Deamon, socket: ${options.socket}${options.port?", Port: "+options.port:""}`;
  return daemon({
    socket: options.socket,
    auth_key: options.auth_key,
    port: options.port,
    chmod: options.chmod
  });
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
      return installUpdateMessage({
        date: new Date(data.date),
        id: data.id,
        version: data.version,
        url: data.url
      });
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
      if (options.tty) bdsCore.httpRequest.pipeFetch({stream: process.stdout as any, path: `/log/${id}?noClose=true`, url: options.host}).catch(() => bdsCore.httpRequest.pipeFetch({stream: process.stdout as any, path: `/log/${id}?noClose=true`, socket: {path: options.socket, protocoll: "http"}}));
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
  }).command("migrate", "Migrate your existing servers to the daemon", async yargs => {
    yargs.parseSync();
    throw new Error("Under construction, wait for the next version");
  }).parseAsync();
}).command("local", "Run server localy", async yargs => {
  return yargs.command("install", "Install server", async yargs => {
    const options = yargs.option("platform", {
      alias: "p",
      type: "string",
      demandOption: true
    }).option("version", {
      alias: "v",
      type: "string",
      default: "latest"
    }).option("id", {
      alias: "I",
      type: "string",
      default: "default"
    }).option("newId", {
      alias: "n",
      type: "boolean",
      default: false
    }).parseSync();

    return (async function(): Promise<any> {
      // Bedrock
      if (options.platform?.toLocaleLowerCase() === "bedrock") return bdsCore.Bedrock.installServer(options.version, {id: options.id, newId: options.newId});
      // Java
      else if (options.platform?.toLocaleLowerCase() === "java") return bdsCore.Java.installServer(options.version, {id: options.id, newId: options.newId});
      // Pocketmine-MP
      else if ((["pocketmine", "pocketminemp"]).includes(options.platform?.toLocaleLowerCase())) return bdsCore.PocketmineMP.installServer(options.version, {id: options.id, newId: options.newId});
      // Spigot
      else if (options.platform?.toLocaleLowerCase() === "spigot") return bdsCore.Spigot.installServer(options.version, {id: options.id, newId: options.newId});
      // Powernukkit
      else if (options.platform?.toLocaleLowerCase() === "powernukkit") return bdsCore.Powernukkit.installServer(options.version, {id: options.id, newId: options.newId});
      // PaperMC
      else if ((["paper", "papermc"]).includes(options.platform?.toLocaleLowerCase())) return bdsCore.PaperMC.installServer(options.version, {id: options.id, newId: options.newId});
      // Throw
      else throw new Error("Invalid platform!");
    })().then(data => installUpdateMessage(data));
  }).command("start", "Start server", async yargs => {
    const options = yargs.option("platform", {
      alias: "p",
      type: "string",
      demandOption: true,
    }).option("id", {
      alias: "I",
      type: "string",
      default: "default"
    }).option("maxMemory", {
      alias: "m",
      type: "boolean",
      default: true,
      description: "On java severs, use all free memory to run server"
    }).option("update", {
      alias: "u",
      type: "string",
      description: "Update Server after start Server"
    }).parseSync();
    return (async function(){
      // Bedrock
      if (options.platform?.toLocaleLowerCase() === "bedrock") {
        if (options.update) await bdsCore.Bedrock.installServer(options.update, {id: options.id}).then(data => installUpdateMessage({...data, isUpdate: true}));
        return bdsCore.Bedrock.startServer({id: options.id});
      }
      // Pocketmine-MP
      else if ((["pocketmine", "pocketminemp"]).includes(options.platform?.toLocaleLowerCase())) {
        if (options.update) await bdsCore.PocketmineMP.installServer(options.update, {id: options.id}).then(data => installUpdateMessage({...data, isUpdate: true}));
        return bdsCore.PocketmineMP.startServer({id: options.id});
      }
      // Java
      else if (options.platform?.toLocaleLowerCase() === "java") {
        if (options.update) await bdsCore.Java.installServer(options.update, {id: options.id}).then(data => installUpdateMessage({...data, isUpdate: true}));
        return bdsCore.Java.startServer({platformOptions: {id: options.id}, maxFreeMemory: options.maxMemory});
      }
      // Spigot
      else if (options.platform?.toLocaleLowerCase() === "spigot") {
        if (options.update) await bdsCore.Spigot.installServer(options.update, {id: options.id}).then((data: any) => installUpdateMessage({...data, isUpdate: true}));
        return bdsCore.Spigot.startServer({platformOptions: {id: options.id}, maxFreeMemory: options.maxMemory});
      }
      // Powernukkit
      else if (options.platform?.toLocaleLowerCase() === "powernukkit") {
        if (options.update) await bdsCore.Powernukkit.installServer(options.update, {id: options.id}).then(data => installUpdateMessage({...data, isUpdate: true}));
        return bdsCore.Powernukkit.startServer({platformOptions: {id: options.id}, maxFreeMemory: options.maxMemory});
      }
      // PaperMC
      else if ((["paper", "papermc"]).includes(options.platform?.toLocaleLowerCase())) {
        if (options.update) await bdsCore.PaperMC.installServer(options.update, {id: options.id}).then(data => installUpdateMessage({...data, isUpdate: true}));
        return bdsCore.PaperMC.startServer({platformOptions: {id: options.id}, maxFreeMemory: options.maxMemory});
      }
      // Throw
      else throw new Error("Invalid platform!");
    })().then(server => {
      const line = readline({input: process.stdin, output: process.stdout});
      server.events.on("log_stderr", data => console.log(cliColors.redBright(data)));
      server.events.on("log_stdout", data => console.log(cliColors.greenBright(data)));
      server.events.on("exit", data => console.info("Server exit with %s, signal: %s", data.code, data.signal));
      line.on("line", line => server.runCommand(line));
      line.once("SIGINT", () => server.stopServer());
      line.once("SIGCONT", () => server.stopServer());
      line.once("SIGTSTP", () => server.stopServer());
      server.events.once("exit", () => line.close());
      return server.waitExit();
    })
  }).command("ls", "List IDs and Platforms installed", () => bdsCore.platformPathManeger.getIds().then(data => Object.keys(data).map(key => utils.format(cliColors.blueBright("Platform: %s\n  %s"), key.charAt(0).toUpperCase() + key.slice(1), data[key].length===0?cliColors.redBright("No Installs"):cliColors.greenBright("ID: "+data[key].join("\n  ID: "))))).then(Print => console.log(Print.join("\n\n"), "\n"))).parseAsync();
});

yargs.command({command: "*", handler: () => {yargs.showHelp();}}).parseAsync();