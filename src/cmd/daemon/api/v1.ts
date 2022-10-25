import fs from "node:fs";
import express from "express";
import * as bdsCore from "@the-bds-maneger/core";
export const app_v1 = express.Router();

// Send Sessions
app_v1.get("/", ({res}) => res.json(Object.keys(bdsCore.globalPlatfroms.internalSessions).map(key => {
  return {
    id: bdsCore.globalPlatfroms.internalSessions[key].id,
    platform: bdsCore.globalPlatfroms.internalSessions[key].platform,
    serverStarted: bdsCore.globalPlatfroms.internalSessions[key].serverStarted,
    portListen: bdsCore.globalPlatfroms.internalSessions[key].portListening,
    playerActions: bdsCore.globalPlatfroms.internalSessions[key].playerActions,
  };
})));

// Install server
app_v1.put("/server", async (req, res, next) => {
  try {
  if (!req.body||Object.keys(req.body).length === 0) return res.status(400).json({
    error: "Body is empty"
  });
  const action = req.body.action as "install"|"start";
  const platform = req.body.platform as bdsCore.platformPathManeger.bdsPlatform;
  if (action === "install" && req.body.version === undefined) req.body.version = "latest";

  if (platform === "bedrock") {
    if (action === "install") return res.json(await bdsCore.Bedrock.installServer(req.body.version, req.body.platformOptions));
    else if (action === "start") {
      const platform = await bdsCore.Bedrock.startServer(req.body.platformOptions);
      return res.json({
        id: platform.id
      });
    }
  } else if (platform === "pocketmine") {
    if (action === "install") return res.json(await bdsCore.PocketmineMP.installServer(req.body.version, req.body.platformOptions));
    else if (action === "start") {
      const platform = await bdsCore.PocketmineMP.startServer(req.body.platformOptions);
      return res.json({
        id: platform.id
      });
    }
  } else if (platform === "java") {
    if (action === "install") return res.json(await bdsCore.Java.installServer(req.body.version, req.body.platformOptions));
    else if (action === "start") {
      const platform = await bdsCore.Java.startServer(req.body.javaOptions);
      return res.json({
        id: platform.id
      });
    }
  } else if (platform === "paper") {
    if (action === "install") return res.json(await bdsCore.PaperMC.installServer(req.body.version, req.body.platformOptions));
    else if (action === "start") {
      const platform = await bdsCore.PaperMC.startServer(req.body.javaOptions);
      return res.json({
        id: platform.id
      });
    }
  } else if (platform === "spigot") {
    if (action === "install") return res.json(await bdsCore.Spigot.installServer(req.body.version, req.body.platformOptions));
    else if (action === "start") {
      const platform = await bdsCore.Spigot.startServer(req.body.javaOptions);
      return res.json({
        id: platform.id
      });
    }
  } else if (platform === "powernukkit") {
    if (action === "install") return res.json(await bdsCore.Powernukkit.installServer(req.body.version, req.body.platformOptions));
    else if (action === "start") {
      const platform = await bdsCore.Powernukkit.startServer(req.body.javaOptions);
      return res.json({
        id: platform.id
      });
    }
  }} catch(err) {
    return next(err);
  }

  return res.status(400).json({
    error: "Invalid action"
  });
});

app_v1.get("/log/:id", (req, res) => {
  const session = bdsCore.globalPlatfroms.internalSessions[req.params.id];
  if (!session) return res.status(400).json({error: "Session ID not exists!"});
  res.status(200);
  if (session.serverCommand.options?.logPath?.stdout) fs.createReadStream(session.serverCommand.options.logPath.stdout, {autoClose: false, emitClose: false}).on("data", data => res.write(data));
  session.events.on("log", data => res.write(Buffer.from(data+"\n")));
  session.events.once("exit", () => {if (res.closed) res.end()});
  return res;
});

app_v1.put("/command/:id", (req, res) => {
  const session = bdsCore.globalPlatfroms.internalSessions[req.params.id];
  if (!session) return res.status(400).json({error: "Session ID not exists!"});
  session.runCommand(req.body?.command);
  return res;
});

app_v1.get("/stop/:id", (req, res, next) => {
  const session = bdsCore.globalPlatfroms.internalSessions[req.params.id];
  if (!session) return res.status(400).json({error: "Session ID not exists!"});
  return session.stopServer().then(exitCode => res.status(200).json({exitCode})).catch(err => next(err));
});