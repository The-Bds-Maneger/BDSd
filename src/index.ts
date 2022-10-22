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

function daemonRequest(host: string, socketPath: string) {
  async function post(requestPath: string, body?: any) {
    return bdsCore.httpRequest.getJSON({
      method: "POST",
      socket: {
        socketPath,
        path: requestPath
      },
      headers: {"Content-Type": "application/json"},
      body: body||{}
    }).catch(() => bdsCore.httpRequest.getJSON({
      method: "POST",
      url: host+requestPath,
      headers: {"Content-Type": "application/json"},
      body: body||{}
    }));
  }

  async function get(requestPath: string, body?: any) {
    return bdsCore.httpRequest.getJSON({
      socket: {
        socketPath,
        path: requestPath
      },
      headers: {"Content-Type": "application/json"},
      body: body||{}
    }).catch(() => bdsCore.httpRequest.getJSON({
      url: host+requestPath,
      headers: {"Content-Type": "application/json"},
      body: body||{}
    }));
  }

  async function put(requestPath: string, body?: any) {
    return bdsCore.httpRequest.getJSON({
      method: "PUT",
      socket: {
        socketPath,
        path: requestPath
      },
      headers: {"Content-Type": "application/json"},
      body: body||{}
    }).catch(() => bdsCore.httpRequest.getJSON({
      method: "PUT",
      url: host+requestPath,
      headers: {"Content-Type": "application/json"},
      body: body||{}
    }));
  }

  async function stream(requestPath: string, stream?: any, method: bdsCore.httpRequest.requestOptions["method"] = "GET") {
    return bdsCore.httpRequest.pipeFetch({
      stream, method,
      socket: {
        socketPath,
        path: requestPath
      },
      headers: {"Content-Type": "application/json"}
    }).catch(() => bdsCore.httpRequest.pipeFetch({
      url: host+requestPath,
      stream, method,
      headers: {"Content-Type": "application/json"}
    }));
  }

  return {post, get, put, stream};
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
    default: "http://localhost:9074",
  }).command("install", "Download and Install server to folder", async yargs => {
    const opts = yargs.option("version", {alias: "v", default: "latest"}).option("id", {alias: "i", type: "string", default: "default"}).option("platform", {demandOption: true}).parseSync();
    const { post } = daemonRequest(opts.host, opts.socket);
    return post("/install", {platform: opts.platform, version: opts.version, platformOptions: {id: opts.id}}).then((data: {id: string, version: string, date: string, url: string}) => installUpdateMessage({
      date: new Date(data.date),
      id: data.id,
      version: data.version,
      url: data.url
    }));
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
    const { post, put, stream } = daemonRequest(options.host, options.socket);
    return post("/", {platform: options.platform, version: options.version, platformOptions: {id: options.id}}).then(({id}) => {
      console.log("Server ID: %s", id);
      if (options.interactive) {
        const line = readline({input: process.stdin, output: process.stdout});
        line.on("line", data => put("/", {id, commands: data}));
        if (options.stopOnClose) {
          line.once("SIGINT", () => post("/stop", {id}).catch(() => null).then(() => line.close()));
          line.once("SIGCONT", () => post("/stop", {id}).catch(() => null).then(() => line.close()));
          line.once("SIGTSTP", () => post("/stop", {id}).catch(() => null).then(() => line.close()));
        }
        if (options.tty) stream(`/log/${id}?noClose=true`, process.stdout).catch(() => undefined).then(() => line.emit("SIGINT"));
      }
    });
  }).command("attach", "attach to runnnig server", async yargs => {
    const options = yargs.option("stopOnClose", {
      alias: "n",
      default: false,
      type: "boolean",
      description: "Stop server if press ctrl+c (close server)"
    }).option("id", {
      alias: "i",
      type: "string",
      demandOption: true,
      description: "Target server id"
    }).parseSync();
    const { post, put, stream } = daemonRequest(options.host, options.socket);
    const line = readline({input: process.stdin, output: process.stdout});
    line.on("line", data => put("/", {id: options.id, commands: data}));
    stream(`/log/${options.id}?noClose=true`, process.stdout).catch(() => undefined).then(() => line.emit("SIGINT"));
    const close = async () => {
      if (options.stopOnClose) await post("/stop", {id: options.id}).catch(() => null);
      return line.close();
    }
    line.once("SIGINT", close);
    line.once("SIGCONT", close);
    line.once("SIGTSTP", close);
  }).command("stop", "Stop server if not infomed IDs stop all", async yargs => {
    const options = yargs.parseSync();
    const { post } = daemonRequest(options.host, options.socket);
    const [,, ...ids] = options._;
    if (ids.length >= 1) return Promise.all(ids.map((id: string) => post("/stop", {id}).then(data => console.log("Server ID: %s\n\tCode Exit: %f", id, data.exitCode)).catch(console.error)));
    return post("/stop/all").then((data: {id: string, exitCode: number}[]) => data.forEach(data => console.log("Server ID: %s\n\tCode Exit: %f", data.id, data.exitCode)));
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

yargs.command({command: "*", handler: () => {yargs.showHelp();}}).parseAsync().catch((err) => {
  console.error("Error: %s", err?.message||err);
  console.error("Error:", err?.options?.body);
  process.exit(1);
});