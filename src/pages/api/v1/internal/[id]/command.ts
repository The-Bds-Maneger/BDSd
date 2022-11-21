import type { NextApiRequest, NextApiResponse } from "next";
import { createReadStream } from "node:fs";
import * as core from "@the-bds-maneger/core";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(404).json({});
  if (typeof req.query.id !== "string") return res.status(400).json({error: "ID not is string"});
  const session = core.globalPlatfroms.internalSessions[req.query.id];
  if (!session) return res.status(404).json({error: "No session exists"});
  console.log(req.body.command);
  session.runCommand(req.body.command);
  return res.status(200).json({ok: true});
}