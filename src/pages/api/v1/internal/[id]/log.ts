import type { NextApiRequest, NextApiResponse } from "next";
import { createReadStream } from "node:fs";
import * as core from "@the-bds-maneger/core";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (typeof req.query.id !== "string") return res.status(400).json({error: "ID not is string"});
  const session = core.globalPlatfroms.internalSessions[req.query.id];
  if (!session) return res.status(404).json({error: "No session exists"});
  res.writeHead(200, {
    "Content-Type": "text/plain"
  });
  return new Promise(done => {
    createReadStream(session.serverCommand.options.logPath.stdout).pipe(res).once("finish", done);
  });
}