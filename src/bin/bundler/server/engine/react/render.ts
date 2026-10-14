import { renderToPipeableStream } from "react-dom/server";
import { PassThrough } from "node:stream";

function render(element: React.ReactElement): Promise<string> {
  return new Promise((resolve, reject) => {
    let html = "";
    let settled = false;
    const stream = new PassThrough();
    const timeout = setTimeout(() => {
      abort();
      fail(new Error("SSR rendering timed out"));
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

    const { pipe, abort } = renderToPipeableStream(element, {
      onAllReady() {
        if (!settled) {
          pipe(stream);
        }
      },

      onError(error) {
        fail(error);
        abort();
      },

      onShellError(error) {
        fail(error);
      },
    });
  });
}

export default render;
