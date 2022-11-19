import { useEffect, useState } from "react";
import {platformPathManeger} from "@the-bds-maneger/core";
import Link from "next/link";
import homeCss from "../styles/home.module.css";

function VersionPlatform() {
  const [currentTarget, setTarget] = useState<platformPathManeger.bdsPlatform>("bedrock");
  const [target, setTargetVersion] = useState([]);
  useEffect(() => {
    fetch(`https://mcpeversion-static.sirherobrine23.org/${currentTarget}/all.json`).then(res => res.json()).then(data => setTargetVersion(data));
  }, [currentTarget]);
  return <div>
    <select name="platform" onChange={e => {e.preventDefault();setTarget(e.currentTarget.value as platformPathManeger.bdsPlatform)}}>
      <option value="bedrock">Bedrock (Mojang)</option>
      <option value="java">Java (Mojang)</option>
      <option value="pocketmine">Pocketmine (PMMP)</option>
      <option value="paper">Paper MC</option>
      <option value="powernukkit">Powernukkit (Bedrock)</option>
      <option value="spigot">Spigot MC</option>
    </select>
    <select>{target?.length === 0?<option disabled>No version</option>:(currentTarget == "bedrock"?target.reverse():target).map((data, jkey) => {
      const vdate = new Date(data.date);
      const day = vdate.getDay()>9?vdate.getDay().toFixed(0):"0"+vdate.getDay().toFixed(0);
      const month = vdate.getMonth()+1>9?(vdate.getMonth()+1).toFixed(0):"0"+(vdate.getMonth()+1).toFixed(0);
      return <option key={jkey+currentTarget+data.version} value={data.version}>{data.version} {data.latest?`(latest)`:""} - {day}/{month}/{vdate.getFullYear()}</option>
    })}</select>
  </div>
}

function PlatformsInstalled() {
  const [platformsIDs, setIDs] = useState({});
  return <div>{Object.keys(platformsIDs).map(platform => {
    return <div key={platform}>
      <h2>{platform}</h2>
      <div className={homeCss["platformID"]}>{platformsIDs[platform].map((data) => {
        const ports = Object.keys(data?.ports||{}).map((port, key) => <li>{port} ({data.ports[port].type}/{data.ports[port].protocol})</li>);
        return <div id={data.running?"running":"stoped"} className={homeCss["platfornCard"]} key={data.id}>
          <Link href={`/control/${data.id}`}><a style={{display: "flex", justifyContent: "space-around"}}>{data.id}</a></Link>
          <div style={{display: ports.length>0?"block":"none"}}>
            <div>
              <span>Players connected: {JSON.stringify(data.players)}</span>
            </div>
            <span>Ports:</span>
            <ul>{ports}</ul>
          </div>
        </div>
      })}</div>
    </div>
  })}</div>
}

export default function Home() {
  async function installPlatform(platform: string, version: string = "latest") {
    console.log(platform, version);
    const res = await fetch("/v2/install", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({platform, version, platformOptions: {newId: true}})
    });
    return res;
  }
  return (<div>
    <div>
      <h1>New Server install</h1>
      <div>
        <form onSubmit={e => {e.preventDefault(); installPlatform(e.currentTarget.querySelector("select:nth-child(1)")["value"], e.currentTarget.querySelector("select:nth-child(2)")["value"])}}>
          <VersionPlatform />
          <button type="submit">Install</button>
        </form>
      </div>
    </div>
    <div><PlatformsInstalled /></div>
  </div>);
}
