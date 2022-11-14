#!/usr/bin/env node
import * as coreUtils from "@the-bds-maneger/core-utils";
import fs from "node:fs/promises";
import path from "node:path";
const files = (await coreUtils.extendFs.readdirrecursive(path.join(process.cwd(), "src"))).filter((file) => /\.(j|d\.t)s/.test(file));
await Promise.all(files.map(async file => fs.rm(file, {force: true})));