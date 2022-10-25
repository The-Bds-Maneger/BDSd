import { useState } from "react";
import logConsoleCss from "./logConsole.module.css";

export type logProps = {
  dataInputFn: (data: string) => void,
};

export default function Log(props: logProps) {
  const [userLog, setUserLog] = useState<string[]>([]);
  return (<>
    <div className={logConsoleCss["log"]}>
      <div className={logConsoleCss["logConfig"]}>{userLog.map((line, key) => {
        return <div key={key}>
          <span className={logConsoleCss["logLine"]}>{line}</span>
        </div>
      })}</div>
    </div>
    <div>
      <input type="text" onSubmit={(e) => props.dataInputFn(e.target["value"])} />
    </div>
  </>);
}