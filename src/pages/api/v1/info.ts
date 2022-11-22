import type { NextApiRequest, NextApiResponse } from "next";
import { userInfo } from "os";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  return res.status(200).json({
    platform: process.platform,
    arch: process.arch,
    user: userInfo()
  });
}