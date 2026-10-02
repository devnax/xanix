import { encode, decode } from "@msgpack/msgpack";
import { Request, Response } from "express";
type ServerCallback = (args: any, context?: Context) => Promise<any>;
type Args = Record<string, any>;

type Context = {
  request: Request;
  response: Response;
};

export const register = new Map<string, ServerCallback>();
export const CHUNK_SIZE = 256 * 1024; // 256 KB

async function uploadFile(file: File) {
  const uploadId = crypto.randomUUID();
  const filename = encodeURIComponent(file.name);

  for (let offset = 0; offset < file.size; offset += CHUNK_SIZE) {
    const chunk = file.slice(offset, Math.min(offset + CHUNK_SIZE, file.size));

    const res = await fetch(`/__xanix__/upload/${uploadId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "X-File-Name": filename,
        "X-File-Size": String(file.size),
        "X-Chunk-Offset": String(offset),
      },
      body: chunk,
    });

    if (!res.ok) {
      throw new Error(`Upload failed: ${res.status}`);
    }
  }

  return `FILE(${uploadId}:${filename}:${file.type})`;
}

const server = (callback: ServerCallback, id?: string) => {
  if (id) register.set(id, callback);
  return async (args: Args = {}) => {
    if (__XANIX_SERVER__) {
      return await callback(args);
    } else {
      for (const key in args) {
        const file = args[key];
        if (file instanceof File) {
          const fid = await uploadFile(file);
          args[key] = fid;
        }
      }

      const binary = encode(args);
      const res = await fetch(`/__xanix__/server/${id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/msgpack",
        },
        body: binary,
      });
      if (res.status !== 200) {
        throw new Error(`Request failed with status ${res.status}`);
      }
      const buffer = await res.arrayBuffer();
      return decode(new Uint8Array(buffer));
    }
  };
};

export default server;
