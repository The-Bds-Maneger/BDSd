import { InferGetStaticPropsType, NextPageContext } from "next";
import bdsCore from "@the-bds-maneger/core";
import Link from "next/link";

export default function Home({ids}: InferGetStaticPropsType<typeof getServerSideProps>) {
  return <div>
    <h1>No Sessions IDs</h1>
    <form onSubmit={e => {
      e.preventDefault();
      const platform = e.currentTarget.querySelector("select").value;
      fetch("/v2/install", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({platform})
      }).then(res => res.json()).then(data => window.location.href = `/ui/control/${data.id}`);
    }}>
      <select name="platform">
        <option value="bedrock">Bedrock (Mojang)</option>
        <option value="java">Java (Mojang)</option>
        <option value="pocketmine">Pocketmine (PMMP)</option>
        <option value="spigot">Spigot MC</option>
        <option value="powernukkit">Powernukkit</option>
        <option value="paper">Paper</option>
      </select>
      <button type="submit">Start</button>
    </form>
  </div>;
}

export async function getServerSideProps(context: NextPageContext) {
  const ids = Object.keys(bdsCore.utils.globalPlatfroms.internalSessions);
  return {
    props: {ids},
  }
}