import os from "node:os";
import http from "node:http";
import express from "express";
import expressRateLimit from "express-rate-limit";
import fs, { Mode } from "node:fs";
import fsPromise from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import app_v2 from "./api/v2";
import ui from "./api/ui/index";
import { app_v1 } from "./api/v1";
import { Server } from "socket.io";
import * as bdsCore from "@the-bds-maneger/core";
import * as Prometheus from "prom-client";

Prometheus.collectDefaultMetrics({prefix: "bdsd"});
const requests = new Prometheus.Counter({
  name: "bdsd_requests",
  help: "Total number of requests to the Server",
  labelNames: ["method", "from", "path"]
});

export const bdsdAuth = path.join(bdsCore.platformPathManeger.bdsRoot, "bdsd_auth.json");
async function auth(Auth: string) {
  // External requests
  if (!fs.existsSync(bdsdAuth)) {
    if (!fs.existsSync(bdsCore.platformPathManeger.bdsRoot)) await fsPromise.mkdir(bdsCore.platformPathManeger.bdsRoot, {recursive: true});
    const keys = crypto.generateKeyPairSync("rsa", {modulusLength: 4096, publicKeyEncoding: {type: "spki", format: "pem"}, privateKeyEncoding: {type: "pkcs8", format: "pem", cipher: "aes-256-cbc", passphrase: crypto.randomBytes(128).toString("hex")}});
    await fsPromise.writeFile(bdsdAuth, JSON.stringify(keys, null, 2));
    console.log("Bdsd Keys\nPublic base64: '%s'\n\npublic:\n%s", Buffer.from(keys.publicKey).toString("base64"), keys.publicKey);
    return false;
  }

  if (!Auth) throw new Error("Auth required");
  const authorizationPub = Buffer.from(Auth, "base64").toString("utf8").trim();
  const publicKey = (JSON.parse(await fsPromise.readFile(bdsdAuth, "utf8")) as crypto.KeyPairSyncResult<string, string>).publicKey.trim();
  if (publicKey === authorizationPub) return true;
  return false;
}

export default async function app(options: {socket: string, port?: number, auth_key: boolean, chmod?: Mode}) {
  const app = express();
  const httpServer = http.createServer(app);
  const socket = http.createServer(app);
  const io = new Server(httpServer);

  // App Route
  app.disable("x-powered-by").disable("etag").use(express.json()).use(express.urlencoded({extended: true}));
  app.use(({ res, next }) => { res.json = (body: any) => res.setHeader("Content-Type", "application/json").send(JSON.stringify(body, null, 2)); return next(); });
  app.get("/metrics", async ({res, next}) => Prometheus.register.metrics().then(data => res.set("Content-Type", Prometheus.register.contentType).send(data)).catch(err => next(err)));
  app.use((req, _, next) => {requests.inc({method: req.method, path: req.path, from: !(req.socket.remoteAddress&&req.socket.remotePort)?"socket":req.protocol});next();});
  app.use(expressRateLimit({skipSuccessfulRequests: true, message: "Already reached the limit, please wait a few moments", windowMs: (1000*60)*2, max: 1500}));

  let timesBefore = os.cpus().map(c => c.times);
  function getAverageUsage() {
    let timesAfter = os.cpus().map(c => c.times);
    let timeDeltas = timesAfter.map((t, i) => ({
      user: t.user - timesBefore[i].user,
      sys: t.sys - timesBefore[i].sys,
      idle: t.idle - timesBefore[i].idle
    }));
    timesBefore = timesAfter;
    return Math.floor(timeDeltas.map(times => 1 - times.idle / (times.user + times.sys + times.idle)).reduce((l1, l2) => l1 + l2) / timeDeltas.length*100);
  }

  app.get("/info", ({res}) => {
    return res.status(200).json({
      platform: process.platform,
      arch: process.arch,
      cpu: {
        avg: getAverageUsage(),
        cores: os.cpus().length,
      },
      bdsCore: {
        serversRunning: Object.keys(bdsCore.globalPlatfroms.internalSessions).length,
        rootStorage: bdsCore.platformPathManeger.bdsRoot,
      },
    });
  });

  // API Routes
  app.all(/^\/ui(|.*)/, await ui("/ui"));
  app.get("/", ({res}) => res.redirect("/ui"));
  app.use("/v1", app_v1);
  app.use("/v2", app_v2);
  app.use("/", app_v2);

  // Errors pages
  app.all("*", (req, res) => res.status(404).json({error: "Page not found", path: req.path}));
  app.use((error, _1, res, _3) => {
    console.log("Internal Error:", error);
    return res.status(500).setHeader("Content-Type", "application/json").json({
      internalError: error?.message||error?.name||String(error),
    })
  });

  if (options.port) {
    httpServer.listen(options.port, () => console.info("HTTP listen on http://127.0.0.1:%s", options.port));
    // Socket.io
    io.use(async (socket, next) => {
      if (!options.auth_key) return next();
      const { handshake } = socket;
      console.log(handshake.address, handshake.auth);
      if (await auth(handshake.auth.pub)) return next();
      return next(new Error("Auth invalid"));
    });

    // Express
    app.use(async (req, res, next) => {
      if (!options.auth_key) return next();
      // Allow by default socket
      if (!req.socket.remoteAddress && !req.socket.remotePort) return next();

      if (await auth(req.headers.authorization?.replace(/^.*\s+/, ""))) return next();
      return res.status(400).json({
        error: "Invalid auth or incorret public key"
      });
    });
  }

  // Listen socks
  if (fs.existsSync(options.socket)) fs.rmSync(options.socket, {force: true});
  socket.listen(options.socket, async function () {
    // if (options.chmod) await fsPromise.chmod(options.socket, options.chmod);
    console.info("Socket listen on '%s'", this.address());
  });

  return app;
};
