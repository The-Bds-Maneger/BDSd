import { platformPathManeger, globalPlatfroms } from "@the-bds-maneger/core";
import { GetServerSidePropsContext, InferGetStaticPropsType } from "next";
import { useEffect, useState } from "react";
import { getStatusAndIDs } from "./api/v1/ls";
import { httpRequestClient } from "@the-bds-maneger/core-utils";
import Link from "next/link";
import homeCss from "../styles/home.module.css";
import Head from "next/head";

function VersionPlatform() {
  const [currentTarget, setTarget] = useState<platformPathManeger.bdsPlatform>("bedrock");
  const [target, setTargetVersion] = useState([]);
  useEffect(() => {
    (async () => {
      setTargetVersion([]);
      const data = await (await fetch(`https://mcpeversion-static.sirherobrine23.org/${currentTarget}/all.json`)).json();
      if (currentTarget == "bedrock") {
        setTargetVersion(data.reverse().filter(({release}) => release !== "preview"));
        return;
      }
      setTargetVersion(data);
    })();
  }, [currentTarget]);
  const mapVersions = target.map((data, jkey) => {
    const vdate = new Date(data.date);
    const day = vdate.getDay()>9?vdate.getDay().toFixed(0):"0"+vdate.getDay().toFixed(0);
    const month = vdate.getMonth()+1>9?(vdate.getMonth()+1).toFixed(0):"0"+(vdate.getMonth()+1).toFixed(0);
    return <option key={jkey+currentTarget+data.version} value={data.version}>{data.version} {(data.latest === undefined?jkey === 0:data.latest)?`(latest)`:""} - {day}/{month}/{vdate.getFullYear()}</option>
  });
  return <div>
    <select name="platform" onChange={e => {e.preventDefault();setTarget(e.currentTarget.value as platformPathManeger.bdsPlatform)}}>
      <option value="bedrock">Bedrock (Mojang)</option>
      <option value="java">Java (Mojang)</option>
      <option value="pocketmine">Pocketmine (PMMP)</option>
      <option value="paper">Paper MC</option>
      <option value="powernukkit">Powernukkit (Bedrock)</option>
      <option value="spigot">Spigot MC</option>
    </select>
    <select defaultValue={""}>{mapVersions.length === 0?<option disabled defaultValue={""}>Loading ...</option>:mapVersions}</select>
  </div>
}

function InstallNewPlatform() {
  async function installPlatform(platform: string, version: string = "latest") {
    console.log(platform, version);
    const res = await fetch("/api/v1", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({platform, version, id: "new"})
    });
    return res;
  }
  return <div>
  <h1>New Server install</h1>
  <div>
    <form onSubmit={e => {e.preventDefault(); installPlatform(e.currentTarget.querySelector("select:nth-child(1)")["value"], e.currentTarget.querySelector("select:nth-child(2)")["value"])}}>
      <VersionPlatform />
      <button type="submit">Install</button>
    </form>
  </div>
</div>
}

export default function Home(initProps: InferGetStaticPropsType<typeof getServerSideProps>) {
  const [ids, updateIds] = useState(initProps.ids);
  useEffect(() => {
    let closed = false;
    (async () => {
      while (true) {
        if (closed) break;
        const data = await fetch("/api/v1/ls");
        if (data.status === 200) {
          const ids = await data.json();
          updateIds(ids);
          await new Promise(done => setTimeout(done, 800));
        } else closed = true;
      }
    })();
    return () => {
      closed = true;
    }
  }, []);
  return (<div>
    <Head><title>BDSd Main page</title></Head>
    <><InstallNewPlatform /></>
    <div>
      <div>{Object.keys(ids||{}).map(platform => {
      return <div key={platform}>
        <h2>{platform}</h2>
        <div className={homeCss["platformID"]}>{ids[platform as platformPathManeger.bdsPlatform].map((data) => {
          const startStop = async (stop?: true) => {
            await fetch("/api/v1", {
              method: stop?"DELETE":"PUT",
              headers: {"Content-Type": "application/json"},
              body: JSON.stringify({id: data.id, platform})
            });
          }
          return <div key={data.id+"listHome"} id={data.running?"running":"stoped"} className={homeCss["platfornCard"]}>
            <Link href={`/control/${data.id}`}><span>{data.id}</span></Link>
            <button style={{display: data.running?"none":"block"}} onClick={() => startStop()}>Start server</button>
            <button style={{display: data.running?"block":"none"}} onClick={() => startStop(true)}>Stop server</button>
            <div style={{display: (data.running && Object.keys(data.data?.portListening||{}).length > 0)?"block":"none"}}>
              <span>Ports:</span>
              {Object.keys(data.data?.portListening||{}).map(port => {
                const portInfo = data.data.portListening[(port as any) as number];
                return <div key={port+"portList"} style={{paddingLeft: "16px"}}>
                  <span>{port} ({portInfo.type})</span>
                  <span> </span>
                  <a style={{display: (["bedrock", "pocketmine", "powernukkit"]).includes(data.data.platform)?undefined:"none"}} href={`minecraft://\?addExternalServer=${data.id}|${initProps.remoteHost}:${port}`}>Add Server</a>
                </div>;
              })}
            </div>
            <div style={{display: (Object.keys(data.data?.playerActions||{}).length > 0?undefined:"none")}}>
              <span>Players:</span>
              {Object.keys(data.data?.playerActions||{}).map((player, key) => {
                const playerData = data.data.playerActions[player];
                return <div key={key+player}>
                  <span>{player}:</span>
                  <div>{JSON.stringify(playerData)}</div>
                </div>
              })}
            </div>
          </div>
        })}</div>
      </div>
    })}</div>
    </div>
  </div>);
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const remoteHost = process.env.HOST||context.req.headers.host||(await httpRequestClient.getExternalIP()).ipv4;
  return {
    props: {
      ids: await getStatusAndIDs(),
      remoteHost
    },
  }
}
