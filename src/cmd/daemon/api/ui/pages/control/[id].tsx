import { InferGetStaticPropsType, NextPageContext } from "next";
import { readFile } from "node:fs/promises";
import path from "node:path";
import bdsCore from "@the-bds-maneger/core";
import { playerBase, portListen } from "@the-bds-maneger/core/src/globalPlatfroms";
import Navbar, {itemsConfig} from "../../components/oldNavbar";
import { FormEvent, useEffect, useState } from "react";
import logConsoleCss from "./logConsole.module.css";
import { io as socket } from "socket.io-client";

const navBarItems: itemsConfig[] = [
  {
    name: "Home",
    url: "/"
  },
  {
    name: "Install/Update Server",
    url: "/install"
  }
];

export default function Home({id, authKey}: InferGetStaticPropsType<typeof getServerSideProps>) {
  const [userLog, setUserLog] = useState<string[]>([]);
  let loadedLogs = false;
  useEffect(() => {
    if (!loadedLogs) {
      fetch(`/v2/log/${id}`).then(res => res.status === 200?res.text():Promise.reject(res.statusText)).then(data => {
        setUserLog(data.split(/\r?\n/).map(line => line.trim()));
        loadedLogs = true;
      }).catch(console.error);
    }

    const io = socket({
      auth: {
        pub: authKey
      }
    });

    io.on("error", console.error);

    // Log data
    io.on("log", (data: {id: string, data: string}) => {
      if (data.id !== id) return;
      setUserLog(old => [...old, data.data])
    });

    if (typeof Notification !== "undefined") {
      Notification.requestPermission();
      if (Notification.permission === "granted") {
        io.on("playerConnect", (data: {id: string, data: playerBase}) => {
          if (data.id !== id) return;
          new Notification("Player Connect", {
            body: `Player ${data.data.playerName}`
          });
        });
        io.on("portListening", (data: {id: string, data: portListen}) => {
          if (data.id !== id) return;
          new Notification("Server port listen", {
            body: `Port ${data.data.port}`
          });
        });
      }
    }

    return () => {
      io.close();
    };
  }, [setUserLog]);

  async function sendCommand(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const commandInput = e.currentTarget.querySelector("input");
    await fetch("/v2", {
      method: "PUT",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({commands: commandInput.value.trim(), id})
    });
    commandInput.value = "";
  }

  return <>
    <Navbar items={navBarItems} />
    <div className={logConsoleCss["log"]}>
      <div className={logConsoleCss["logConfig"]}>{userLog.map((line, key) => {
        if (!line) return <div key={key}><span className={logConsoleCss["logLine"]}>&nbsp;</span></div>
        return <div key={key}><span className={logConsoleCss["logLine"]}>{line}</span></div>
      })}</div>
    </div>
    <div className={logConsoleCss["command"]}>
      <form onSubmit={sendCommand}>
        <input type="text"/>
        <button type="submit">Send command</button>
      </form>
    </div>
  </>;
}

export async function getServerSideProps(context: NextPageContext) {
  const bdsdAuth = path.join(bdsCore.utils.platformPathManeger.bdsRoot, "bdsd_auth.json");
  const authKey = JSON.parse(await readFile(bdsdAuth, "utf8").catch(() => "{}")).public||null;
  return {
    props: {id: context.query.id as string, authKey},
  }
}