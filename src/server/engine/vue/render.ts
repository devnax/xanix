import { pipeToNodeWritable } from "vue/server-renderer";
import { PassThrough } from "node:stream";
import type { App } from "vue";

function render(app: App, ctx: Record<string, any> = {}): Promise<string> {
  return new Promise((resolve, reject) => {
    let html = "";
    let settled = false;
    const stream = new PassThrough();

    const timeout = setTimeout(() => {
      // Vue has no abort(); destroying the stream stops the render and emits "error"
      stream.destroy(new Error("SSR rendering timed out"));
    }, 10_000);

    const cleanup = () => clearTimeout(timeout);

    const fail = (error: unknown) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };

    const streamResult = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(html);
    };

    stream.on("data", (chunk) => {
      html += chunk.toString();
    });

    stream.on("end", streamResult);
    stream.on("error", fail);

    // Errors during rendering destroy the writable, which lands in the "error" handler above
    pipeToNodeWritable(app, ctx, stream);
  });
}

export default render;
