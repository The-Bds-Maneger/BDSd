import * as  core from "@the-bds-maneger/core";
export function normalizePlatform(name: string): core.platformPathManeger.bdsPlatform {
  if (!name) throw new Error("Blank platform");
  name = name.trim().toLowerCase();
  if (name === "bedrock") return "bedrock";
  else if (name === "java") return "java";
  else if (name === "pocketmine"||name === "pocketminepmmp"||name === "pocketminemp") return "pocketmine";
  else if (name === "spigot"||name === "spigotmc") return "spigot";
  else if (name === "paper"||name === "papermc") return "paper";
  else if (name === "powernukkit"||name === "powernukkitmc") return "powernukkit";
  else throw new Error("Invalid platform");
}