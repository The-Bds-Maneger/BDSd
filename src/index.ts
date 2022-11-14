#!/usr/bin/env node
import * as core from "@the-bds-maneger/core";
import * as coreUtils from "@the-bds-maneger/core-utils";
import { createReadStream } from "node:fs";
import { format } from "node:util";
import { createInterface as readline } from "node:readline"
import { httpRequest } from "@the-bds-maneger/core-utils";
import { normalizePlatform } from "./normalize";
import fs from "node:fs/promises";
import express from "express";
import yargs from "yargs";
import node_notifier from "node-notifier";
import path from "node:path";

class api {
  private readonly app = express().use(express.json(), express.urlencoded({extended: true}));
  private list: {platform: string, id: string}[] = [];
  constructor(logStart?: string) {
    const app = this.app;
    app.get("/", ({res}) => {
      const serverSessions = core.globalPlatfroms.internalSessions;
      res.json(Object.keys(serverSessions).map(id => ({id, session: serverSessions[id]})).reduce((mount, data) => {
        mount[data.id] = {
          ...data.session,
          events: undefined,
          serverCommand: undefined
        };
        return mount;
      }, {} as {[key: string]: core.globalPlatfroms.serverActionV2}));
    });
    app.delete("/", (req, res, next) => {
      if (!req.body) req.body = {};
      if (!req.body.id) return res.status(400).json({
        error: "Require ID"
      });
      const session = core.globalPlatfroms.internalSessions[req.body.id];
      if (!session) return res.status(400).json({error: "return valid ID"});
      return session.stopServer().then(exitCode => res.status(200).json({exitCode})).catch(err => next(err));
    });
    app.put("/", (req, res, next) => {
      const platform = normalizePlatform(req.body?.platform);
      const id = req.body?.id||"default";
      (async () => {
        if (platform === "bedrock") return core.Bedrock.startServer({id});
        else if (platform === "java") return core.Java.startServer({maxMemory: req.body?.maxMemory, platformOptions: {id}});
        else if (platform === "paper") return core.PaperMC.startServer({maxMemory: req.body?.maxMemory, platformOptions: {id}});
        else if (platform === "spigot") return core.Spigot.startServer({maxMemory: req.body?.maxMemory, platformOptions: {id}});
        else if (platform === "powernukkit") return core.Powernukkit.startServer({maxMemory: req.body?.maxMemory, platformOptions: {id}});
        return core.PocketmineMP.startServer({id});
      })().then(async data => {
        data.events.on("log", logData => console.log("[%s %s]: %s", new Date(), data.id, logData));
        data.events.on("exit", codeExit => console.log("[%s %s]: Exit with code/signal %s", new Date(), data.id, codeExit));
        res.status(200).json({...data, event: undefined});
        if (logStart) {
          this.list.push({id: data.id, platform: data.platform});
          await fs.writeFile(logStart, JSON.stringify(this.list));
        }
      }).catch(err => next(err));
    });
    app.post("/", (req, res) => {
      if (!req.body) req.body = {};
      if (!req.body.id) return res.status(400).json({error: "Require ID"});
      if (!req.body.command) return res.status(400).json({error: "Required Command to run in server"});
      const session = core.globalPlatfroms.internalSessions[req.body.id];
      if (!session) return res.status(400).json({error: "return valid ID"});
      session.runCommand(req.body.command);
      return res.status(200).json({ok: true});
    });
    app.get("/ls", ({res, next}) => core.platformPathManeger.getIds().then(data => res.status(200).json(data)).catch(err => next(err)));
    app.put("/install", (req, res, next) => {
      const platform = normalizePlatform(req.body?.platform);
      const options = {version: req.body.version||"latest", id: req.body?.id||"new"};
      (async function() {
        if (platform === "bedrock") return core.Bedrock.installServer(options.version, {...(options.id.trim().toLowerCase() === "new"?{newId: true}:{id: options.id})});
        else if (platform === "java") return core.Java.installServer(options.version, {...(options.id.trim().toLowerCase() === "new"?{newId: true}:{id: options.id})});
        else if (platform === "paper") return core.PaperMC.installServer(options.version, {...(options.id.trim().toLowerCase() === "new"?{newId: true}:{id: options.id})});
        else if (platform === "pocketmine") return core.PocketmineMP.installServer(options.version, {...(options.id.trim().toLowerCase() === "new"?{newId: true}:{id: options.id})});
        else if (platform === "powernukkit") return core.Powernukkit.installServer(options.version, {...(options.id.trim().toLowerCase() === "new"?{newId: true}:{id: options.id})});
        else return core.Spigot.installServer(options.version, {...(options.id.trim().toLowerCase() === "new"?{newId: true}:{id: options.id})});
      })().then(data => res.status(200).json(data)).catch(err => next(err));
    });

    app.get("/log", (req, res) => {
      if (!req.query.id) return res.status(400).json({error: "Require ID query"});
      else if (typeof req.query.id !== "string") return res.status(400).json({error: "ID type is string"});
      const session = core.globalPlatfroms.internalSessions[req.query.id];
      if (!session) return res.status(400).json({error: "return valid ID"});
      res.writeHead(200, {
        "Content-Type": "text/plain"
      });
      const logStream = createReadStream(session.serverCommand.options.logPath.stdout);
      logStream.on("data", data => res.write(data));
      if (!req.query.lock) return logStream.once("end", () => res.end());
      const event = session.events;
      event.once("exit", () => {
        if (res.writable) res.end();
      });
      function send(data: string) {
        if (!res.writable) return;
        res.write(format("%s\n", data));
        event.once("log_stdout", send);
      }
      return event.once("log_stdout", send);
    });

    // Error API
    app.all("*", ({res}) => res.status(404).json({error: "Not Found", message: "Path request not exists in API routes"}));
    app.use((err: any, req, res, next) => {
      res.status(500).json({
        error: err?.response||err?.message||err
      });
    });

    if (logStart) {
      (async () => {
        if (!await coreUtils.extendFs.exists(logStart)) await fs.writeFile(logStart, "[]");
        this.list = JSON.parse(await fs.readFile(logStart, "utf8"));
        for (const {platform, id} of this.list) {
          if (platform === "bedrock") await core.Bedrock.startServer({id});
          else if (platform === "pocketmine") await core.PocketmineMP.startServer({id});
          else if (platform === "java") await core.Java.startServer({platformOptions: {id}});
          else if (platform === "paper") await core.PaperMC.startServer({platformOptions: {id}});
          else if (platform === "powernukkit") await core.Powernukkit.startServer({platformOptions: {id}});
          else await core.Spigot.startServer({platformOptions: {id}});
        }
      })();
    }
  }

  listen(target: string|number, cb?: () => void) {
    this.app.listen(target, cb);
  }
}

yargs(process.argv.slice(2)).wrap(yargs.terminalWidth()).version(false).help().demandCommand().strictCommands().alias("h", "help").command("background", "Run servers in background", yargs => {
  const options = yargs.option("port", {
    type: "number",
    description: "Port to add an HTTP server for the APIs",
    default: 5030
  }).option("server-history-path", {
    type: "string",
    description: "Place to store the servers boot history in case the main process is killed",
    default: path.join(core.platformPathManeger.bdsRoot, "bdsd_loads.json")
  }).parseSync();
  const apiListen = new api(options["server-history-path"]);
  apiListen.listen(options.port, () => console.log("Listen on", options.port));
  return {apiListen, options};
}).command("install", "Install server", async yargs => {
  const options = yargs.option("local", {
    type: "boolean",
    description: "current host",
    alias: "L",
    default: false,
  }).option("host", {
    type: "string",
    description: "URL do servidor, exemplo: 'http://localhost:5030'",
    default: "http://localhost:5030"
  }).option("platform", {
    type: "string",
    description: "Uma das plataformas suportadas pelo bds Core",
    alias: "p",
    demandOption: true
  }).option("id", {
    type: "string",
    description: "",
    default: "default"
  }).option("version", {
    type: "string",
    description: "Versão do servidor",
    alias: "V",
    default: "latest"
  }).parseSync();
  const platform = normalizePlatform(options.platform);
  const printVersion = (data: any) => {
    let logData = "";
    if (data?.version) logData += `Version: ${data.version}`;
    if (data?.date) {
      if (typeof data.date === "string") data.date = new Date(data.date);
      logData += `\n\tRelease Date: ${data.date.getDay()}/${data.date.getMonth()+1}/${data.date.getFullYear()}`;
    }
    if (data?.url) logData += "\n\tUrl: "+data.url;
    console.log(logData);
  }
  // Remote
  if (!options["local"]) {
    printVersion(await httpRequest.getJSON({
      body: {version: options.version, id: options.id, platform},
      method: "PUT",
      url: `${options.host}/install`
    }));
    return;
  }

  printVersion(await (async function() {
    if (platform === "bedrock") return core.Bedrock.installServer(options.version, {...(options.id.trim().toLowerCase() === "new"?{newId: true}:{id: options.id})});
    else if (platform === "java") return core.Java.installServer(options.version, {...(options.id.trim().toLowerCase() === "new"?{newId: true}:{id: options.id})});
    else if (platform === "paper") return core.PaperMC.installServer(options.version, {...(options.id.trim().toLowerCase() === "new"?{newId: true}:{id: options.id})});
    else if (platform === "pocketmine") return core.PocketmineMP.installServer(options.version, {...(options.id.trim().toLowerCase() === "new"?{newId: true}:{id: options.id})});
    else if (platform === "powernukkit") return core.Powernukkit.installServer(options.version, {...(options.id.trim().toLowerCase() === "new"?{newId: true}:{id: options.id})});
    else return core.Spigot.installServer(options.version, {...(options.id.trim().toLowerCase() === "new"?{newId: true}:{id: options.id})});
  })());
}).command("ps", "List current servers running", async yargs => {
  const options = yargs.option("host", {
    type: "string",
    description: "URL do servidor, exemplo: 'http://localhost:5030'",
    default: "http://localhost:5030"
  }).parseSync();
  const urlData = new URL(options.host);
  const data = await httpRequest.getJSON<{[key: string]: core.globalPlatfroms.serverActionV2}>({url: `${urlData.protocol}//${urlData.host}/`});
  if (Object.keys(data).length === 0) return console.info("No server running!");
  Object.keys(data).forEach(id => {
    const session = data[id];
    console.log("ID: %s, Plaform: %s", id, session.platform);
    if (Object.keys(session.portListening).length > 0) {
      console.log("  Ports: %s", Object.keys(session.portListening).map(port => {
        const portData = session.portListening[(port as any) as number];
        let data = `${portData.host?portData.host+":":""}${port} (${portData.type} ${portData.protocol}${portData.plugin?" Plugin: "+portData.plugin:""})`;

        return data;
      }).join(", "))
    }
    console.log("  Players:")
    const playerData = Object.keys(session.playerActions).reduce((mount, player) => {
      const playerData = session.playerActions[player];
      if (playerData.action === "connect") mount.online.push(player);
      else if (playerData.action === "disconnect") mount.offline.push(player);
      else mount.unk.push(player);
      return mount;
    }, {online: [], offline: [], unk: []});
    console.log("    Connnected: (%f)\n%s", playerData.online.length, playerData.online.join("      \n"));
    console.log("    Disconnnected: (%f)\n%s", playerData.offline.length, playerData.offline.join("      \n"));
  })
}).command("attach", "start or attach to server", async yargs => {
  const options = yargs.option("local", {
    type: "boolean",
    description: "current host",
    alias: "L",
    default: false,
  }).option("host", {
    type: "string",
    description: "URL do servidor, exemplo: 'http://localhost:5030'",
    default: "http://localhost:5030"
  }).option("id", {
    type: "string",
    description: "",
    default: "default"
  }).option("platform", {
    type: "string",
    description: "uma das plataformas do bds core"
  }).option("maxMemory", {
    type: "number",
    description: "Caso a platforma execute no java voçe pode informar mas se não será ignorado",
    alias: "M"
  }).option("close", {
    type: "boolean",
    description: "Stop server if ctrl-c press",
    default: false
  }).parseSync()
  const lineRead = readline(process.stdin, process.stdout);
  if (!options["local"]) {
    if (options.id.trim().toLowerCase() === "default") options.id = (await httpRequest.getJSON({url: `${options.host}/ls`}))[options.platform.trim().toLowerCase()].find(({id}) => options.id === id)?.realID;
    if (!(await httpRequest.getJSON(options.host))[options.id]) {
      options.id = (await httpRequest.getJSON({url: options.host, method: "PUT", body: {platform: options.platform, id: options.id}})).id
    }
    lineRead.on("line", data => httpRequest.getJSON({method: "POST", url: options.host, body: {id: options.id, command: data}}).catch(() => {}));
    httpRequest.pipeFetch({url: `${options.host}/log?lock=true&id=${options.id}`, stream: process.stdout}).then(() => lineRead.close());
    const close = () => options.close?httpRequest.getJSON({method: "DELETE", url: options.host, body: {id: options.id}}).catch(() => {}):process.exit();
    lineRead.once("SIGCONT", close);
    lineRead.once("SIGINT", close);
    lineRead.once("SIGTSTP", close);
    lineRead.once("close", close);
    return;
  }
  const platform = normalizePlatform(options.platform);
  const id = options.id||"default";
  const server = await (async () => {
    if (platform === "bedrock") return core.Bedrock.startServer({id});
    else if (platform === "java") return core.Java.startServer({maxMemory: options.maxMemory, platformOptions: {id}});
    else if (platform === "paper") return core.PaperMC.startServer({maxMemory: options.maxMemory, platformOptions: {id}});
    else if (platform === "spigot") return core.Spigot.startServer({maxMemory: options.maxMemory, platformOptions: {id}});
    else if (platform === "powernukkit") return core.Powernukkit.startServer({maxMemory: options.maxMemory, platformOptions: {id}});
    return core.PocketmineMP.startServer({id});
  })();
  server.events.on("log", console.log);
  server.events.on("playerConnect", data => node_notifier.notify({title: `${data.playerName} connect to server`}));
  server.events.on("playerDisconnect", data => node_notifier.notify({title: `${data.playerName} disconnect from server`}));
  server.events.on("portListening", port => node_notifier.notify({title: "New port listen to server", message: `Now you can connect to the server with port ${port.port}`}));
  lineRead.on("line", data => server.runCommand(data));
  server.events.once("exit", () => lineRead.close());
  lineRead.once("SIGCONT", () => server.stopServer());
  lineRead.once("SIGINT", () => server.stopServer());
  lineRead.once("SIGTSTP", () => server.stopServer());
  lineRead.once("close", () => server.stopServer());
  return new Promise<void>(done => server.events.on("exit", () => done()))
}).parseAsync().catch(err => {
  if (err?.response?.body) console.error(Buffer.isBuffer(err.response.body)?err.response.body.toString("utf8"):err.response.body);
  else console.error(err?.message||err);
  process.exit(1);
});