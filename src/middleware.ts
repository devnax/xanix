import fs from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import type { Request, Response, NextFunction } from "express";
import loadManifest from "./loadManifest.js";

export default async function middleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!req.url.startsWith("/__client/")) {
    return next();
  }

  const id = req.url
    .slice("/__client/".length)
    .split("?")[0]
    .replace(/\.js$/, "");

  if (!id) {
    return res.status(404).send("Client id is missing.");
  }

  try {
    const manifest = await loadManifest();
    const entry = manifest.entries.find((entry) => entry.path === `./${id}`);

    if (!entry) {
      return res.status(404).send(`Client "${id}" was not found in manifest.`);
    }

    const buildPath = path.resolve(entry.build);

    if (!fs.existsSync(buildPath)) {
      return res
        .status(404)
        .send(`Client build "${entry.build}" was not found.`);
    }

    const stat = fs.statSync(buildPath);

    if (!stat.isFile()) {
      return res
        .status(404)
        .send(`Client build is not a file: "${entry.build}"`);
    }

    res.status(200);
    res.setHeader("Content-Type", "application/javascript; charset=utf-8");
    res.setHeader("Content-Length", stat.size);
    res.setHeader("Cache-Control", "no-cache");

    if (req.method === "HEAD") {
      return res.end();
    }

    const stream = fs.createReadStream(buildPath);

    try {
      await pipeline(stream, res);
    } catch (error) {
      if (!res.headersSent) {
        next(error);
      }
    }
  } catch (error) {
    next(error);
  }
}
