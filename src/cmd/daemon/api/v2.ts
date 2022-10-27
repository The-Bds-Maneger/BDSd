import fs from "node:fs";
import express from "express";
import * as bdsCore from "@the-bds-maneger/core";
import { Server } from "socket.io";
const app = express.Router();
export default app;

const bedrock = ["bedrock", "Bedrock"];
const java = ["java", "Java"];
const spigot = ["spigot", "Spigot"];
const powernukkit = ["powernukkit", "Powernukkit"];
const paper = ["paper", "Paper", "papermc", "PaperMC"];
const pocketmine = ["pocketmine", "Pocketmine", "pocketminemp", "PocketmineMP"];

app.post("/stop/all", (_req, res, next) => Promise.all(Object.keys(bdsCore.globalPlatfroms.internalSessions).map(id => bdsCore.globalPlatfroms.internalSessions[id].stopServer().then(exitCode => ({id, exitCode})).catch((err: Error) => err))).then(data => res.json(data)).catch(err => next(err)));
app.get("/", ({res}) => res.json(Object.keys(bdsCore.globalPlatfroms.internalSessions).reduce((sessionRes, sessionID) => {
  sessionRes[sessionID] = {
    platform: bdsCore.globalPlatfroms.internalSessions[sessionID].platform,
    ports: bdsCore.globalPlatfroms.internalSessions[sessionID].portListening,
    player: bdsCore.globalPlatfroms.internalSessions[sessionID].playerActions
  };
  return sessionRes;
}, {})));

app.get("/:id", (req, res) => {
  const session = bdsCore.globalPlatfroms.internalSessions[req.params.id];
  if (!session) return res.status(400).json({error: "Session ID not exists"});
  return res.status(200).json({
    platform: session.platform,
    ports: session.portListening,
    player: session.playerActions
  });
});

app.get("/log/:id", (req, res) => {
  const session = bdsCore.globalPlatfroms.internalSessions[req.params.id];
  if (!session) return res.status(404).json({error: "Session not exists"});
  if (!session.serverCommand?.options?.logPath?.stdout) return res.status(404).json({error: "Not exists log file to session id"});

  const logPipe = fs.createReadStream(session.serverCommand?.options?.logPath?.stdout);
  if (req.query.noClose !== "true") logPipe.pipe(res);
  else {
    function logEmit(data: string|Buffer) {res.write(typeof data === "string"?(data+"\n"):data);}
    logPipe.on("data", logEmit);
    session.events.on("log", logEmit);
    req.socket.once("close", () => session.events.removeListener("log", logEmit));
    session.events.once("exit", () => res.socket.closed?null:res.end(""));
  }
  return res;
});

app.post("/install", (req, res, next) => {
  if (!req.body) req.body = {};
  if (!req.body.platform) return res.status(400).json({error: "Informs a platform to start the server"});
  if (!req.body.version) req.body.version = "latest";

  if (bedrock.includes(req.body.platform)) return bdsCore.Bedrock.installServer(req.body.version, req.body.platformOptions).then(data => res.status(200).json(data)).catch(err => next(err));
  else if (java.includes(req.body.platform)) return bdsCore.Java.installServer(req.body.version, req.body.platformOptions).then(data => res.status(200).json(data)).catch(err => next(err));
  else if (spigot.includes(req.body.platform)) return bdsCore.Spigot.installServer(req.body.version, req.body.platformOptions).then(data => res.status(200).json(data)).catch(err => next(err));
  else if (powernukkit.includes(req.body.platform)) return bdsCore.PocketmineMP.installServer(req.body.version, req.body.platformOptions).then(data => res.status(200).json(data)).catch(err => next(err));
  else if (paper.includes(req.body.platform)) return bdsCore.PaperMC.installServer(req.body.version, req.body.platformOptions).then(data => res.status(200).json(data)).catch(err => next(err));
  else if (pocketmine.includes(req.body.platform)) return bdsCore.PocketmineMP.installServer(req.body.version, req.body.platformOptions).then(data => res.status(200).json(data)).catch(err => next(err));
  else return res.status(400).json({
    error: "Invalid platform"
  });
});

app.post("/", (req, res, next) => {
  if (!req.body) req.body = {};
  (async () => {
    if (!req.body.platform) return res.status(400).json({error: "Informs a platform to start the server"});
    else if (bedrock.includes(req.body.platform)) return bdsCore.Bedrock.startServer(req.body.platformOptions);
    else if (java.includes(req.body.platform)) return bdsCore.Java.startServer(req.body.platformOptions);
    else if (spigot.includes(req.body.platform)) return bdsCore.Spigot.startServer(req.body.platformOptions);
    else if (powernukkit.includes(req.body.platform)) return bdsCore.PocketmineMP.startServer(req.body.platformOptions);
    else if (paper.includes(req.body.platform)) return bdsCore.PaperMC.startServer(req.body.platformOptions);
    else if (pocketmine.includes(req.body.platform)) return bdsCore.PocketmineMP.startServer(req.body.platformOptions);
    else return res.status(400).json({
      error: "Invalid platform"
    });
  })().then((data: bdsCore.globalPlatfroms.serverActionV2) => {
    if (data.id) {
      const {id} = data;
      const io: Server = req["io"];
      res.status(200).json({
        id: data.id,
        platform: data.platform
      });
      data.events.on("log", data => io.emit("log", {id, data}));
      data.events.on("portListening", data => io.emit("portListening", {id, data}));
      data.events.on("playerConnect", data => io.emit("playerConnect", {id, data}));
      data.events.on("playerUnknown", data => io.emit("playerUnknown", {id, data}));
      data.events.on("playerDisconnect", data => io.emit("playerDisconnect", {id, data}));
    }
  }).catch(err => next(err));
});

app.put("/", (req, res) => {
  const session = bdsCore.globalPlatfroms.internalSessions[req.body?.id];
  if (!session) return res.status(404).json({error: "Session not exists"});
  session.runCommand(...(Array.isArray(req.body?.commands)?req.body?.commands:[req.body?.commands]));
  return res.status(200).json({ok: true});
});

app.post("/stop", (req, res, next) => {
  const session = bdsCore.globalPlatfroms.internalSessions[req.body?.id];
  if (!session) return res.status(404).json({error: "Session not exists"});
  return session.stopServer().then(exitCode => res.status(200).json({exitCode})).catch(err => next(err));
});
