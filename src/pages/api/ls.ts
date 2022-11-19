import type { NextApiRequest, NextApiResponse } from "next";
import * as core from "@the-bds-maneger/core";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const ids = await core.platformPathManeger.getIds();
  return res.status(200).json(ids);
}