import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";
import utils from "node:util";
import Yargs from "yargs";
import daemonRequest from "../../libs/daemon_request";
import { createInterface as readline } from "node:readline";
import { installUpdateMessage } from "../../libs/messages";
import daemon, {bdsdAuth} from "./daemon";
import { bdsPlatform } from "@the-bds-maneger/core/src/platformPathManeger";
import { playerHistoric, portListen } from "@the-bds-maneger/core/src/globalPlatfroms";

export async  function daemon_main(Yargs: Yargs.Argv) {
  const keyFile = await fs.readFile(bdsdAuth, "base64").catch(() => "");
  return Yargs.demandCommand().command("daemon", "Start daemon and listen port and socket", yargs => {
    const options = yargs.option("port", {
      alias: "p",
      type: "number",
      description: "Port listen HTTP/HTTPs API"
    }).option("socket", {
      alias: "S",
      type: "string",
      description: "unix socket listen",
      default: process.env.BDSD_SOCKET?path.resolve(process.env.BDSD_SOCKET):path.join(os.tmpdir(), "bdsd.sock"),
    }).option("auth_key", {
      alias: "a",
      type: "boolean",
      description: "Enable auth to HTTP/HTTPs API",
      default: false,
    }).option("chmod", {
      alias: "c",
      type: "number",
      default: 7777
    }).parseSync();
    process.title = `Minecraft Server Deamon, socket: ${options.socket}${options.port?", Port: "+options.port:""}`;
    return daemon({
      socket: options.socket,
      auth_key: options.auth_key,
      port: options.port,
      chmod: options.chmod
    });
  }).option("socket", {
    alias: "S",
    type: "string",
    description: "unix socket listen",
    default: path.join(os.tmpdir(), "bdsd.sock"),
  }).option("host", {
    alias: "H",
    type: "string",
    description: "HTTP/HTTPs host if unix socket not exists",
    default: "http://localhost:39074",
  }).command("install", "Download and Install server to folder", async yargs => {
    const opts = yargs.option("version", {alias: "v", default: "latest"}).option("id", {alias: "i", type: "string", default: "default"}).option("platform", {demandOption: true}).parseSync();
    const { post } = daemonRequest(opts.host, opts.socket, keyFile);
    return post("/install", {platform: opts.platform, version: opts.version, platformOptions: {id: opts.id}}).then((data: {id: string, version: string, date: string, url: string}) => installUpdateMessage({
      date: new Date(data.date),
      id: data.id,
      version: data.version,
      url: data.url
    }))
  }).command("ps", "List Minecraft servers IDs", yargs => {
    const options = yargs.parseSync();
    const { get } = daemonRequest(options.host, options.socket, keyFile);
    return get("/").then(data => {
      const keysData = Object.keys(data).map(id => {
        const a: {platform: bdsPlatform, player: playerHistoric, ports: {[key: string]: portListen}} = data[id];
        return utils.format(
          "Platform: %s, ID: %s\n  Players connected: %f\n  Ports: %s",
          a.platform, id,
            Object.keys(a.player).filter(b => a.player[b].action === "connect").length,
            Object.keys(a.ports).map(b => `${a.ports[b].port} (${a.ports[b].type}/${a.ports[b].protocol})`).join(", ")
        );
      });
      return console.log(keysData.join("\n\n"), "\n");
    });
  }).command("start", "Start minecraft server", async yargs => {
    const options = yargs.option("id", {type: "string", default: "default"}).option("platform", {demandOption: true, type: "string"}).option("interactive", {
      alias: "i",
      type: "boolean",
      default: false,
      description: "Send commands to server"
    }).option("tty", {
      alias: "t",
      type: "boolean",
      default: false,
      description: "Show log"
    }).option("stopOnClose", {
      alias: "n",
      default: true,
      type: "boolean",
      description: "If interactive (-i) stop server if press ctrl+c (close server)"
    }).parseSync();
    const { post, put, stream } = daemonRequest(options.host, options.socket, keyFile);
    return post("/", {platform: options.platform, version: options.version, platformOptions: {id: options.id}}).then(({id}) => {
      console.log("Server ID: %s", id);
      if (options.interactive) {
        const line = readline({input: process.stdin, output: process.stdout});
        line.on("line", data => put("/", {id, commands: data}));
        if (options.stopOnClose) {
          line.once("SIGINT", () => post("/stop", {id}).catch(() => null).then(() => line.close()));
          line.once("SIGCONT", () => post("/stop", {id}).catch(() => null).then(() => line.close()));
          line.once("SIGTSTP", () => post("/stop", {id}).catch(() => null).then(() => line.close()));
        }
        if (options.tty) stream(`/log/${id}?noClose=true`, process.stdout).catch(() => undefined).then(() => line.emit("SIGINT"));
      }
    });
  }).command("attach", "attach to runnnig server", async yargs => {
    const options = yargs.option("stopOnClose", {
      alias: "n",
      default: false,
      type: "boolean",
      description: "Stop server if press ctrl+c (close server)"
    }).option("id", {
      alias: "i",
      type: "string",
      demandOption: true,
      description: "Target server id"
    }).parseSync();
    const { post, put, stream } = daemonRequest(options.host, options.socket, keyFile);
    const line = readline({input: process.stdin, output: process.stdout});
    line.on("line", data => put("/", {id: options.id, commands: data}));
    stream(`/log/${options.id}?noClose=true`, process.stdout).catch(() => undefined).then(() => line.emit("SIGINT"));
    const close = async () => {
      if (options.stopOnClose) await post("/stop", {id: options.id}).catch(() => null);
      return line.close();
    }
    line.once("SIGINT", close);
    line.once("SIGCONT", close);
    line.once("SIGTSTP", close);
  }).command("stop", "Stop server if not infomed IDs stop all", async yargs => {
    const options = yargs.parseSync();
    const { post } = daemonRequest(options.host, options.socket, keyFile);
    const [,, ...ids] = options._;
    if (ids.length >= 1) return Promise.all(ids.map((id: string) => post("/stop", {id}).then(data => console.log("Server ID: %s\n\tCode Exit: %f", id, data.exitCode)).catch(console.error)));
    return post("/stop/all").then((data: {id: string, exitCode: number}[]) => data.forEach(data => console.log("Server ID: %s\n\tCode Exit: %f", data.id, data.exitCode)));
  }).command("migrate", "Migrate your existing servers to the daemon", async yargs => {
    yargs.parseSync();
    throw new Error("Under construction, wait for the next version");
  });
}