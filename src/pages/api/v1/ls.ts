import type { NextApiRequest, NextApiResponse } from "next";
import * as core from "@the-bds-maneger/core";

export type statusReturn = {
  [platform in core.platformPathManeger.bdsPlatform]?: {
    running: boolean,
    id: string,
    data?: core.globalPlatfroms.serverActionV2 & {
      events: undefined,
      serverCommand: undefined
    }
  }[]
}

export async function getStatusAndIDs(): Promise<statusReturn> {
  const ids = await core.platformPathManeger.getIds();
  const data = Object.keys(ids).sort().reduce((mount, platform: core.platformPathManeger.bdsPlatform) => {
    if (!mount[platform]) mount[platform] = [];
    ids[platform].filter(({id}) => id !== "default").forEach(({id}) => {
      const data = core.globalPlatfroms.internalSessions[id];
      mount[platform].push({
        running: !!data, id,
        data: data?{
          ...data,
          events: undefined,
          serverCommand: undefined
        }:undefined
      });
    });
    return mount;
  }, {});
  return JSON.parse(JSON.stringify(data));
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const ids = await getStatusAndIDs();
  return res.status(200).json(ids);
}