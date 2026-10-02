import { decode, encode } from "@msgpack/msgpack";
import express, { Router } from "express";
import fs from "fs";
import path from "path";
import { register, CHUNK_SIZE } from "../../hooks/server.js";

const router = Router();
const TMP_DIR = path.resolve(".xanix/tmp");

const readFile = async (
  uploadId: string,
  filename: string,
  fileType: string,
) => {
  const filePath = path.join(TMP_DIR, uploadId);
  if (!fs.existsSync(filePath)) {
    throw new Error("File not found");
  }
  const buffer = await fs.promises.readFile(filePath);
  return new File([buffer], filename, { type: fileType });
};

router.post(
  "/server/:id",
  express.raw({ type: "application/msgpack" }),
  async (req, res) => {
    const callback = register.get(req.params.id);

    if (!callback) {
      res.status(404).json({
        status: "Action not found",
        id: req.params.id,
      });
      return;
    }

    const args: any = req.body?.length ? decode(new Uint8Array(req.body)) : {};
    let fileIds = [];
    for (const key in args) {
      const value = args[key];
      if (
        typeof value === "string" &&
        value.startsWith("FILE(") &&
        value.endsWith(")")
      ) {
        const [uploadId, filename, fileType] = value.slice(5, -1).split(":");
        args[key] = await readFile(uploadId, filename, fileType);
        fileIds.push(uploadId);
      }
    }

    const data = await callback(args, {
      request: req,
      response: res,
    });
    const buffer = Buffer.from(encode(data));
    for (const uploadId of fileIds) {
      await fs.promises.unlink(path.join(TMP_DIR, uploadId));
    }

    res.set("Content-Type", "application/msgpack");
    res.send(buffer);
  },
);

router.post("/upload/:uploadId", async (req, res) => {
  const { uploadId } = req.params;

  const chunkIndex = Number(req.headers["x-chunk-offset"]);
  const totalChunks = Math.ceil(
    Number(req.headers["x-file-size"]) / CHUNK_SIZE,
  );

  if (!Number.isInteger(chunkIndex) || !Number.isInteger(totalChunks)) {
    res.status(400).json({ error: "Invalid chunk information" });
    return;
  }

  await fs.promises.mkdir(TMP_DIR, { recursive: true });
  const filePath = path.join(TMP_DIR, uploadId);
  const stream = fs.createWriteStream(filePath, {
    flags: chunkIndex === 0 ? "w" : "a",
  });

  req.pipe(stream);

  stream.on("finish", async () => {
    if (chunkIndex === totalChunks - 1) {
      res.json({
        success: true,
        complete: true,
        uploadId,
      });
      return;
    }

    res.json({
      success: true,
      complete: false,
      chunkIndex,
    });
  });

  stream.on("error", () => {
    res.status(500).json({
      success: false,
      error: "Failed to write chunk",
    });
  });
});

export default router;
