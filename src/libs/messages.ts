import cliColor from "cli-color";

export function installUpdateMessage(data: {date: Date, id?: string, version: string, url?: string, isUpdate?: boolean}) {
  const releaseDate = new Date(data?.date), day = releaseDate.getDay()>9?releaseDate.getDay().toFixed(0):"0"+releaseDate.getDay(), month = (releaseDate.getMonth()+1)>9?(releaseDate.getMonth()+1).toFixed(0):"0"+(releaseDate.getMonth()+1);
  if (data?.isUpdate) console.log(cliColor.yellowBright("Update Platform ID: %s\n\tVersion: %s, Release date: %s/%s/%s"), data?.id, data?.version, day, month, releaseDate.getFullYear());
  else console.log(cliColor.greenBright("Install Platform ID: %s\n\tVersion: %s, Release date: %s/%s/%s"), data?.id, data?.version, day, month, releaseDate.getFullYear());
}