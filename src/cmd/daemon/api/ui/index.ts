import { Router } from "express";
import next from "next";

export default async function main_ui(routePath: string) {
  const nextApp = next({
    dev: process.env.NODE_ENV !== "production",
    dir: __dirname,
    conf: {
      basePath: routePath
    }
  });
  const handle = nextApp.getRequestHandler();
  const app = Router()
  app.all("*", handle as any);
  await nextApp.prepare();
  return app;
}
