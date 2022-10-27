import type { NextApiRequest, NextApiResponse } from "next"
import bdsCore, {globalPlatfroms} from "@the-bds-maneger/core";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    const ids = await bdsCore.utils.platformPathManeger.getIds() as {[platform: string]: {id: string, realID?: string}[]};;
    const platformIds: { [id: string]: any[] } = {}

    //
    platformIds["Bedrock"] = (ids["bedrock"]||[]).filter(({id}) => id !== "default").map(({id}) => {
      const session = globalPlatfroms.internalSessions[id];
      return { id, running: !!session, ports: session?.portListening, players: session?.playerActions };
    });
    platformIds["Java"] = (ids["java"]||[]).filter(({id}) => id !== "default").map(({id}) => {
      const session = globalPlatfroms.internalSessions[id];
      return { id, running: !!session, ports: session?.portListening, players: session?.playerActions };
    });
    platformIds["Spigot"] = (ids["spigot"]||[]).filter(({id}) => id !== "default").map(({id}) => {
      const session = globalPlatfroms.internalSessions[id];
      return { id, running: !!session, ports: session?.portListening, players: session?.playerActions };
    });
    platformIds["Powernukkit"] = (ids["powernukkit"]||[]).filter(({id}) => id !== "default").map(({id}) => {
      const session = globalPlatfroms.internalSessions[id];
      return { id, running: !!session, ports: session?.portListening, players: session?.playerActions };
    });
    platformIds["Paper"] = (ids["paper"]||[]).filter(({id}) => id !== "default").map(({id}) => {
      const session = globalPlatfroms.internalSessions[id];
      return { id, running: !!session, ports: session?.portListening, players: session?.playerActions };
    });

    //
    res.status(200).json(platformIds);
  }
  res.status(404).json({error: "page not found"});
}