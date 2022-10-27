import { InferGetStaticPropsType, NextPageContext } from "next";
import { readFile } from "node:fs/promises";
import path from "node:path";
import bdsCore from "@the-bds-maneger/core";
import { playerBase, portListen } from "@the-bds-maneger/core/src/globalPlatfroms";
import Navbar, {itemsConfig} from "../../components/oldNavbar";
import { FormEvent, useEffect, useRef, useState } from "react";
import logConsoleCss from "../../style/logConsole.module.css";
import { io as socket } from "socket.io-client";

const navBarItems: itemsConfig[] = [];

// Socket client
const io = socket();
io.on("error", console.error);

export default function Home(props: InferGetStaticPropsType<typeof getServerSideProps>) {
  const [userLog, setUserLog] = useState<string[]>((props.log||[]));
  const [serverIsRunning, setServerStatus] = useState(props.startServer||false);
  const logRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function plConnect(data: {id: string, data: playerBase}) {
      if (data.id !== props.id) return;
      new Notification("Player Connect", {
        body: `Player ${data.data.playerName}`
      });
    }

    function portListen(data: {id: string, data: portListen}) {
      if (data.id !== props.id) return;
      new Notification("Server port listen", {
        body: `Port ${data.data.port}`
      });
    }

    async function log(data: {id: string, data: string}) {
      if (data.id !== props.id) return;
      setUserLog(old => [...old, data.data]);
      await new Promise(done => setTimeout(done, 600)).then(() => logRef.current?.scrollIntoView({behavior: "smooth", block: "end", inline: "nearest"}));
    }

    if (typeof Notification !== "undefined") {
      Notification.requestPermission();
      if (Notification.permission === "granted") {
        io.on("playerConnect", plConnect);
        io.on("portListening", portListen);
      }
    }

    fetch(`/v2/${props.id}`).then(res => setServerStatus(res.status === 200));
    const statusServer = setInterval(() => fetch(`/v2/${props.id}`).then(res => setServerStatus(res.status === 200)), 1000);

    // Log data
    io.on("log", log);
    logRef.current?.scrollIntoView({behavior: "smooth", block: "end", inline: "nearest"});
    return () => {
      clearInterval(statusServer);
      io.off("log", log);
      if (Notification?.permission === "granted") {
        io.off("playerConnect", plConnect);
        io.off("portListening", portListen);
      }
    };
  }, [setUserLog, io]);

  async function sendCommand(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const commandInput = e.currentTarget.querySelector("input");
    await fetch("/v2", {
      method: "PUT",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({commands: commandInput.value.trim(), id: props.id})
    });
    commandInput.value = "";
  }

  const StopServer = () => fetch("/v2/stop", {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({id: props.id})}).then(async res => res.status !== 200?Promise.reject(new Error((await res.json()).error)):null);
  const StartServer = () => fetch("/v2", {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({platform: props.platform, id: props.id})}).then(async res => res.status !== 200 ?Promise.reject(new Error((await res.json()).error)):null)

  return <>
    <Navbar items={navBarItems} />
    <div>
      <div className={logConsoleCss["actionButton"]}>
        <div className={logConsoleCss["customButton"]} onClick={StartServer}>Start</div>
        {serverIsRunning?<div style={{color: "green"}}>Running</div>:<div style={{color: "red"}}>Stoped</div>}
        <div className={logConsoleCss["customButton"]} onClick={StopServer}>Stop</div>
      </div>
      <div className={logConsoleCss["log"]}>
        <div className={logConsoleCss["logConfig"]} ref={logRef}>{userLog.map((line, key) => {
          if (!line) return <div key={key}><span className={logConsoleCss["logLine"]}>&nbsp;</span></div>
          return <div key={key} className={logConsoleCss["logLine"]}><span>{line}</span></div>
        })}</div>
      </div>
      <div className={logConsoleCss["command"]}>
        <form onSubmit={sendCommand}>
          <input type="text"/>
          <button type="submit">Send command</button>
        </form>
      </div>
    </div>
  </>;
}

export async function getServerSideProps(context: NextPageContext) {
  const id = context.query.id as string;
  const startServer = bdsCore.utils.globalPlatfroms.internalSessions[id];
  const authKey = JSON.parse(await readFile(path.join(bdsCore.utils.platformPathManeger.bdsRoot, "bdsd_auth.json"), "utf8").catch(() => "{}")).public||null;
  const ids = await bdsCore.utils.platformPathManeger.getIds() as {[platform: string]: {id: string, realID?: string}[]};
  const platform = Object.keys(ids).find(platform => ids[platform].some(({id: someId}) => someId === id.trim()))||null;
  const log: string[] = startServer?.serverCommand?.options?.logPath?.stdout?(await readFile(startServer?.serverCommand?.options?.logPath?.stdout, "utf8").catch(() => "")).split(/\r?\n/):[];
  return {
    props: {authKey, id, platform, startServer: !!startServer, log},
  }
}