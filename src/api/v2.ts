import fs from "node:fs";
import express from "express";
import * as bdsCore from "@the-bds-maneger/core";
const app = express.Router();
export default app;

app.get("/", ({res}) => res.json(Object.keys(bdsCore.globalPlatfroms.internalSessions).reduce((sessionRes, sessionID) => {
  sessionRes[sessionID] = {
    platform: bdsCore.globalPlatfroms.internalSessions[sessionID].platform,
    ports: bdsCore.globalPlatfroms.internalSessions[sessionID].portListening,
    player: bdsCore.globalPlatfroms.internalSessions[sessionID].playerActions
  };

  return sessionRes
}, {})));

app.post("/", (req, res, next) => {
  if (!req.body.platform) return res.status(400).json({error: "Informs a platform to start the server"});
  else if (req.body.platform === "bedrock"||req.body.platform === "Bedrock") return bdsCore.Bedrock.startServer(req.body.platformOptions).then(data => res.status(200).json({id: data.id, platform: data.platform})).catch(err => next(err));
  else if (req.body.platform === "java"||req.body.platform === "Java") return bdsCore.Java.startServer(req.body.platformOptions).then(data => res.status(200).json({id: data.id, platform: data.platform})).catch(err => next(err));
  else if (req.body.platform === "spigot"||req.body.platform === "Spigot") return bdsCore.Spigot.startServer(req.body.platformOptions).then(data => res.status(200).json({id: data.id, platform: data.platform})).catch(err => next(err));
  else if (req.body.platform === "powernukkit"||req.body.platform === "Powernukkit") return bdsCore.PocketmineMP.startServer(req.body.platformOptions).then(data => res.status(200).json({id: data.id, platform: data.platform})).catch(err => next(err));
  else if (req.body.platform === "paper"||req.body.platform === "Paper"||req.body.platform === "papermc"||req.body.platform === "PaperMC") return bdsCore.PaperMC.startServer(req.body.platformOptions).then(data => res.status(200).json({id: data.id, platform: data.platform})).catch(err => next(err));
  else if (req.body.platform === "pocketmine"||req.body.platform === "Pocketmine"||req.body.platform === "PocketmineMP"||req.body.platform === "PocketmineMP") return bdsCore.PocketmineMP.startServer(req.body.platformOptions).then(data => res.status(200).json({id: data.id, platform: data.platform})).catch(err => next(err));
  else return res.status(400).json({
    error: "Invalid platform"
  });
});

app.post("/install", (req, res, next) => {
  if (!req.body) req.body = {};
  if (!req.body.platform) return res.status(400).json({error: "Informs a platform to start the server"});
  if (!req.body.version) req.body.version = "latest";

  if (req.body.platform === "bedrock"||req.body.platform === "Bedrock") return bdsCore.Bedrock.installServer(req.body.version).then(data => res.status(200).json(data)).catch(err => next(err));
  else if (req.body.platform === "java"||req.body.platform === "Java") return bdsCore.Java.installServer(req.body.version).then(data => res.status(200).json(data)).catch(err => next(err));
  else if (req.body.platform === "spigot"||req.body.platform === "Spigot") return bdsCore.Spigot.installServer(req.body.version).then(data => res.status(200).json(data)).catch(err => next(err));
  else if (req.body.platform === "powernukkit"||req.body.platform === "Powernukkit") return bdsCore.PocketmineMP.installServer(req.body.version).then(data => res.status(200).json(data)).catch(err => next(err));
  else if (req.body.platform === "paper"||req.body.platform === "Paper"||req.body.platform === "papermc"||req.body.platform === "PaperMC") return bdsCore.PaperMC.installServer(req.body.version).then(data => res.status(200).json(data)).catch(err => next(err));
  else if (req.body.platform === "pocketmine"||req.body.platform === "Pocketmine"||req.body.platform === "PocketmineMP"||req.body.platform === "PocketmineMP") return bdsCore.PocketmineMP.installServer(req.body.version).then(data => res.status(200).json(data)).catch(err => next(err));
  else return res.status(400).json({
    error: "Invalid platform"
  });
});

app.post("/stop", (req, res, next) => {
  const session = bdsCore.globalPlatfroms.internalSessions[req.body?.id];
  if (!session) return res.status(404).json({error: "Session not exists"});
  return session.stopServer().then(exitCode => res.status(200).json({exitCode})).catch(err => next(err));
});

app.put("/", (req, res) => {
  const session = bdsCore.globalPlatfroms.internalSessions[req.body?.id];
  if (!session) return res.status(404).json({error: "Session not exists"});
  session.runCommand(...(Array.isArray(req.body?.commands)?req.body?.commands:[req.body?.commands]));
  return res.status(220).json({ok: true});
});

app.get("/log/:id", (req, res) => {
  const session = bdsCore.globalPlatfroms.internalSessions[req.params.id];
  if (!session) return res.status(404).json({error: "Session not exists"});
  if (!session.serverCommand?.options?.logPath?.stdout) return res.status(404).json({error: "Not exists log file to session id"});
  return fs.createReadStream(session.serverCommand?.options?.logPath?.stdout).pipe(res);
});