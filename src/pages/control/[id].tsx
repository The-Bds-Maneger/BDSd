import { InferGetStaticPropsType, NextPageContext } from "next";
import { globalPlatfroms, platformPathManeger } from "@the-bds-maneger/core";
import { useEffect, useRef, useState } from "react";
import ansi_to_html from "ansi-to-html";
import controlCss from "../../styles/control.module.css";
import Head from "next/head";

const conevert = new ansi_to_html({
  newline: true,
  escapeXML: true
});

export async function getServerSideProps(request: NextPageContext) {
  if (typeof request.query.id !== "string") throw new Error("Invalid ID");
  const correct = {...(globalPlatfroms.internalSessions[request.query.id]), events: undefined, serverCommand: undefined};
  const ids = await platformPathManeger.getIds();
  let platform = Object.keys(ids).find(platform => ids[platform as platformPathManeger.bdsPlatform].some(({id}) => id === request.query.id as string));
  return {
    props: {
      data: JSON.parse(JSON.stringify(correct)) as typeof correct,
      id: request.query.id,
      platform: platform||null,
    },
  }
}

export default function Control(props: InferGetStaticPropsType<typeof getServerSideProps>) {
  if (Object.keys(props.data).length === 0) return <div>
    <h1>Platform not started</h1>
    <div>
      <button onClick={async () => {
        await fetch("/api/v1", {
          method: "PUT",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify({id: props.id, platform: props.platform})
        });
      }}>Start</button>
    </div>
  </div>;
  const [logData, updateLoadData] = useState<string[]>([]);
  useEffect(() => {
    let renderClose = false;
    (async () => {
      while (true) {
        if (renderClose) return;
        const res = await fetch(`/api/v1/internal/${props.id}/log`);
        if (res.status === 200) {
          const lines = (await res.text()).replace(/\u001b\(B\u001b\[m\n\u001b\]0;/gmi, "\n").replace(/\x07\x1B\[38;5;87m|\x07\x1B\]0;/gm, "\n").replace(/\u001b\(B/gmi, "").replace(/PocketMine-MP.*Memory.*[0-9\.]+%(\n|)/gmi, "");
          updateLoadData(lines.split(/\r?\n/));
        } else renderClose = true;
        await new Promise(done => setTimeout(done, 800));
      }
    })();
    return () => {
      renderClose = true;
    }
  });
  const command = useRef(null);
  const sendComand = async () => {
    const commandText: string = command.current?.value;
    if (!commandText) return null;
    const res = await fetch(`/api/v1/internal/${props.id}/command`, {
      method: "POST",
      body: JSON.stringify({command: commandText}),
      headers: {"Content-Type": "application/json"}
    });
    if (res.status === 200) command.current.value = "";
  }
  return <>
    <Head><title>Maneging {props.data?.platform||"Nothing"} Server</title></Head>
    <div className={controlCss["logMain"]}>
      <div className={controlCss["logData"]}>
        {logData.map((data, key) => {
          return <div className={controlCss["logLine"]} key={key+"_log_line"}>
            <div dangerouslySetInnerHTML={{__html: conevert.toHtml(data)}}></div>
          </div>
        })}
      </div>
      <div>
        <form className={controlCss["commandForm"]} onSubmit={(event) => {event.preventDefault(); return sendComand();}}>
          <input type="text" name="command" ref={command} />
          <button type="submit">Send command</button>
        </form>
      </div>
    </div>
  </>;
}