import { encode, decode } from "@msgpack/msgpack";
import { Request, Response } from "express";
import cache, { CacheOption } from "./cache.js";
import xanix from "../server/index.js";
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

const server = (
  callback: ServerCallback,
  options?: CacheOption,
  id?: string,
) => {
  let cb = async (args: Args = {}, context?: Context) => {
    if (__XANIX_SERVER__) {
      try {
        xanix.emit("action:start", {
          args,
          id: id!,
          request: context?.request,
          response: context?.response,
        });
        const result = await callback(args, context);
        xanix.emit("action:end", {
          args,
          id: id!,
          request: context?.request,
          response: context?.response,
        });
        return result;
      } catch (error: any) {
        xanix.emit("action:error", {
          error,
          args,
          id: id!,
          request: context?.request,
          response: context?.response,
        });
        throw error;
      }
    } else {
      try {
        for (const key in args) {
          const file = args[key];
          if (file instanceof File) {
            xanix.emit("upload:start", {
              file: file,
            });
            const fid = await uploadFile(file);
            args[key] = fid;
            xanix.emit("upload:end", {
              file: file,
              id: fid,
            });
          }
        }

        xanix.emit("action:start", {
          args,
          id: id!,
        });

        const binary = encode(args);
        const res = await fetch(`/__xanix__/server/${id}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/xanix",
          },
          body: binary,
        });
        if (res.status !== 200) {
          throw new Error(`Request failed with status ${res.status}`);
        }
        const buffer = await res.arrayBuffer();
        const result = decode(new Uint8Array(buffer));
        xanix.emit("action:end", {
          args,
          id: id!,
        });
        return result;
      } catch (error: any) {
        xanix.emit("action:error", {
          error,
          args,
          id: id!,
        });
        throw error;
      }
    }
  };

  const cachecb: any = cache(cb, {
    ...options,
    validate: ({ entry, args }) => {
      const entryArgs = entry.args[0];
      const currentArgs = args[0];
      try {
        if (JSON.stringify(entryArgs) !== JSON.stringify(currentArgs)) {
          return false;
        }
      } catch (error) {
        return false;
      }
      return true;
    },
  });
  register.set(id!, cachecb as any);
  return cachecb;
};

export default server;
