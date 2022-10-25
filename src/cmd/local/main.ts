import yargs from "yargs";
import { createInterface as readline } from "node:readline";
import { installUpdateMessage } from "../../libs/messages";
import utils from "node:util";
import bdsCore from "@the-bds-maneger/core";
import cliColors from "cli-color";
import notifier from "node-notifier";

export function local_main(Yargs: yargs.Argv) {
  return Yargs.demandCommand().command("install", "Install server", async yargs => {
    const options = yargs.option("platform", {
      alias: "p",
      type: "string",
      demandOption: true
    }).option("version", {
      alias: "v",
      type: "string",
      default: "latest"
    }).option("id", {
      alias: "I",
      type: "string",
      default: "default"
    }).option("newId", {
      alias: "n",
      type: "boolean",
      default: false
    }).parseSync();

    return (async function(): Promise<any> {
      // Bedrock
      if (options.platform?.toLocaleLowerCase() === "bedrock") return bdsCore.Bedrock.installServer(options.version, {id: options.id, newId: options.newId});
      // Java
      else if (options.platform?.toLocaleLowerCase() === "java") return bdsCore.Java.installServer(options.version, {id: options.id, newId: options.newId});
      // Pocketmine-MP
      else if ((["pocketmine", "pocketminemp"]).includes(options.platform?.toLocaleLowerCase())) return bdsCore.PocketmineMP.installServer(options.version, {id: options.id, newId: options.newId});
      // Spigot
      else if (options.platform?.toLocaleLowerCase() === "spigot") return bdsCore.Spigot.installServer(options.version, {id: options.id, newId: options.newId});
      // Powernukkit
      else if (options.platform?.toLocaleLowerCase() === "powernukkit") return bdsCore.Powernukkit.installServer(options.version, {id: options.id, newId: options.newId});
      // PaperMC
      else if ((["paper", "papermc"]).includes(options.platform?.toLocaleLowerCase())) return bdsCore.PaperMC.installServer(options.version, {id: options.id, newId: options.newId});
      // Throw
      else throw new Error("Invalid platform!");
    })().then(data => installUpdateMessage(data));
  }).command("start", "Start server", async yargs => {
    const options = yargs.option("platform", {
      alias: "p",
      type: "string",
      demandOption: true,
    }).option("id", {
      alias: "I",
      type: "string",
      default: "default"
    }).option("maxMemory", {
      alias: "m",
      type: "boolean",
      default: true,
      description: "On java severs, use all free memory to run server"
    }).option("update", {
      alias: "u",
      type: "string",
      description: "Update Server after start Server"
    }).parseSync();
    return (async function(){
      // Bedrock
      if (options.platform?.toLocaleLowerCase() === "bedrock") {
        if (options.update) await bdsCore.Bedrock.installServer(options.update, {id: options.id}).then(data => installUpdateMessage({...data, isUpdate: true}));
        return bdsCore.Bedrock.startServer({id: options.id});
      }
      // Pocketmine-MP
      else if ((["pocketmine", "pocketminemp"]).includes(options.platform?.toLocaleLowerCase())) {
        if (options.update) await bdsCore.PocketmineMP.installServer(options.update, {id: options.id}).then(data => installUpdateMessage({...data, isUpdate: true}));
        return bdsCore.PocketmineMP.startServer({id: options.id});
      }
      // Java
      else if (options.platform?.toLocaleLowerCase() === "java") {
        if (options.update) await bdsCore.Java.installServer(options.update, {id: options.id}).then(data => installUpdateMessage({...data, isUpdate: true}));
        return bdsCore.Java.startServer({platformOptions: {id: options.id}, maxFreeMemory: options.maxMemory});
      }
      // Spigot
      else if (options.platform?.toLocaleLowerCase() === "spigot") {
        if (options.update) await bdsCore.Spigot.installServer(options.update, {id: options.id}).then((data: any) => installUpdateMessage({...data, isUpdate: true}));
        return bdsCore.Spigot.startServer({platformOptions: {id: options.id}, maxFreeMemory: options.maxMemory});
      }
      // Powernukkit
      else if (options.platform?.toLocaleLowerCase() === "powernukkit") {
        if (options.update) await bdsCore.Powernukkit.installServer(options.update, {id: options.id}).then(data => installUpdateMessage({...data, isUpdate: true}));
        return bdsCore.Powernukkit.startServer({platformOptions: {id: options.id}, maxFreeMemory: options.maxMemory});
      }
      // PaperMC
      else if ((["paper", "papermc"]).includes(options.platform?.toLocaleLowerCase())) {
        if (options.update) await bdsCore.PaperMC.installServer(options.update, {id: options.id}).then(data => installUpdateMessage({...data, isUpdate: true}));
        return bdsCore.PaperMC.startServer({platformOptions: {id: options.id}, maxFreeMemory: options.maxMemory});
      }
      // Throw
      else throw new Error("Invalid platform!");
    })().then(server => {
      const line = readline({input: process.stdin, output: process.stdout});
      server.events.on("log_stderr", data => console.log(cliColors.redBright(data)));
      server.events.on("log_stdout", data => console.log(cliColors.greenBright(data)));
      server.events.on("exit", data => console.log(...(data.signal?["Server exit with %s, signal: %s", data.code, data.signal]:["Server exit with %s", data.code])));
      line.on("line", line => server.runCommand(line));
      line.once("SIGINT", () => server.stopServer());
      line.once("SIGCONT", () => server.stopServer());
      line.once("SIGTSTP", () => server.stopServer());
      server.events.once("exit", () => line.close());
      server.events.on("playerConnect", (data) => {
        return notifier.notify({
          title: `Player connect (${server.id})`,
          message: data.playerName
        });
      });
      server.events.on("playerDisconnect", (data) => {
        return notifier.notify({
          title: `Player disconnect (${server.id})`,
          message: data.playerName
        });
      });
      server.events.on("portListening", (data) => {
        return notifier.notify({
          title: `Server port listen (${server.id})`,
          message: `${data.port}`
        });
      });
      return server.waitExit();
    });
  }).command("ls", "List IDs and Platforms installed", async () => {
    const ids = await bdsCore.utils.platformPathManeger.getIds();
    const data = Object.keys(ids).map(key => {
      let text = cliColors.redBright("No Installs");
      if (ids[key].length > 0) text = cliColors.greenBright("ID: "+ids[key].map(a => a.id === "default" ? `${a.id} -> ${a.realID}` : a.id).join("\n  ID: "));
      return utils.format(cliColors.blueBright("Platform: %s\n  %s"), cliColors.yellow(key.charAt(0).toUpperCase() + key.slice(1)), text);
    });
    console.log(data.join("\n\n"), "\n");
  });
}