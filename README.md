# The new BDSd

A unified way to manage multiple Minecraft java and Bedrock servers inside the container or locally.

## What's is BDSd

BDSd is 'B'e'd'rock 'S'server 'd'aemon, but it not only manages Bedrock, also java and derivatives as it ended up becoming a global platform to manage Minecraft Servers

## Install BDSd

- npx: `npx @the-bds-maneger/bdsd`
- Windows: `npm install -g @the-bds-maneger/bdsd`
- MacOS/Linux: `sudo npm install -g @the-bds-maneger/bdsd`
- Android/Termux: `npm install -g @the-bds-maneger/bdsd`

## Migrate `Container`/`bds-cli` to new BDSd

I know that sudden changes are bad, but it always comes with improvements.

the `Bds Cli` folks can get pretty used to it as most commands will be preserved inside the `local bdsd`.

the `Container` folks will have to make a big change because they haven't been updated for more than two major `Bds Maneger core` updates, sorry but you'll have to manually migrate your container because I don't know which version you stopped!

you will have to migrate using `bdsd server migrate <PATH>` and if you use mount volumes it has a different `PATH` than `/data` because `THIS PATH` is DEFAULT from servers from BDSd to containers and attach a shell inside the container in order to run `bdsd server migrate <PATH>`.

## Daemon API

A faster way to manage Minecraft servers without having to crash your main terminal or leave a window open¹ to keep running your server.

> **Note**
>
> 1. You still need a way to leave the daemon service in the background as it is a service that exposes a Unix socket by default in the `temporary` system folder and can be changed with the `BDSD_SOCKET` ENV or the `--socket` option when starting the service.
>
> 2. The `Container` folks will have to get used to the new API standard which is located in the `/v2` (alias to `/`) and `/v1` (deprecated use `/v2`) routes.
