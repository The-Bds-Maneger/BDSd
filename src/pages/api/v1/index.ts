import type { NextApiRequest, NextApiResponse } from "next";
import { normalizePlatform } from "../../../normalize";
import * as core from "@the-bds-maneger/core";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!req.body) req.body = {};
  // Start
  if (req.method === "PUT") {
    const platform = normalizePlatform(req.body?.platform);
    const id = req.body?.id||"default";
    return (async () => {
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
    });
  }
  // Stop
  else if (req.method === "DELETE") {
    if (!req.body?.id) return res.status(400).json({error: "Required ID"});
    if (typeof req.body.id !== "string") return res.status(400).json({error: "Invalid ID type"});
    const session = core.globalPlatfroms.internalSessions[req.body.id];
    if (!session) return res.status(404).json({error: "Session ID not exists"});
    const exitCode = await session.stopServer();
    return res.status(200).json({exitCode});
  }
  // Install
  else if (req.method === "POST") {
    const platform = normalizePlatform(req.body?.platform);
    const options = {version: req.body.version||"latest", id: req.body?.id||"new"};
    return (async function() {
      if (platform === "bedrock") return core.Bedrock.installServer(options.version, {...(options.id.trim().toLowerCase() === "new"?{newId: true}:{id: options.id})});
      else if (platform === "java") return core.Java.installServer(options.version, {...(options.id.trim().toLowerCase() === "new"?{newId: true}:{id: options.id})});
      else if (platform === "paper") return core.PaperMC.installServer(options.version, {...(options.id.trim().toLowerCase() === "new"?{newId: true}:{id: options.id})});
      else if (platform === "pocketmine") return core.PocketmineMP.installServer(options.version, {...(options.id.trim().toLowerCase() === "new"?{newId: true}:{id: options.id})});
      else if (platform === "powernukkit") return core.Powernukkit.installServer(options.version, {...(options.id.trim().toLowerCase() === "new"?{newId: true}:{id: options.id})});
      else return core.Spigot.installServer(options.version, {...(options.id.trim().toLowerCase() === "new"?{newId: true}:{id: options.id})});
    })().then(data => res.status(200).json(data));
  }
  // List
  else if (req.method === "GET") {
    const sessions_ids = Object.keys(core.globalPlatfroms.internalSessions).reduce((mount, id) => {
      const data = core.globalPlatfroms.internalSessions[id];
      mount[id] = {
        ...data,
        events: undefined,
        serverCommand: undefined,
      };
      return mount;
    }, {});
    return res.json(sessions_ids);
  }
  throw new Error("End");
}