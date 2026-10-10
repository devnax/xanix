import path from "node:path";
import { spawn, type ChildProcess } from "node:child_process";
import pc from "picocolors";
import outdirs from "../../../outdirs.js";

const serverInfo: { port?: number; url?: string } = {};

let child: ChildProcess | undefined;
let firstStart = false;
let restartQueue: Promise<void> = Promise.resolve();

function stopCurrentServer(): Promise<void> {
  const previous = child;

  if (!previous || previous.exitCode !== null || previous.signalCode !== null) {
    if (child === previous) child = undefined;
    return Promise.resolve();
  }

  return new Promise<void>((resolve, reject) => {
    const onExit = () => {
      previous.off("error", onError);

      if (child === previous) child = undefined;

      resolve();
    };

    const onError = (error: Error) => {
      previous.off("exit", onExit);
      reject(error);
    };

    previous.once("exit", onExit);
    previous.once("error", onError);

    if (!previous.kill()) {
      previous.off("exit", onExit);
      previous.off("error", onError);

      if (child === previous) child = undefined;

      resolve();
    }
  });
}

async function startServerInternal(): Promise<void> {
  await stopCurrentServer();

  const filePath = path.join(outdirs.server, "index.js");

  await new Promise<void>((resolve, reject) => {
    const current = spawn(process.execPath, [filePath], {
      stdio: ["inherit", "inherit", "inherit", "ipc"],
    });

    child = current;

    let ready = false;
    let settled = false;

    const cleanup = () => {
      current.off("message", onMessage);
      current.off("error", onError);
      current.off("exit", onExit);
    };

    const onMessage = (message: any) => {
      if (message?.type !== "xanix:ready") return;

      ready = true;
      settled = true;

      serverInfo.port = message.port;
      serverInfo.url = message.url;

      if (!firstStart) {
        firstStart = true;

        console.log("");
        console.log(
          `  ${pc.blue("➜ Local:")} ${pc.cyan(serverInfo.url ?? "")}`,
        );
        console.log("");
      }

      cleanup();
      resolve();
    };

    const onError = (error: Error) => {
      if (settled) return;

      settled = true;
      cleanup();

      if (child === current) child = undefined;

      reject(error);
    };

    const onExit = (code: number | null, signal: NodeJS.Signals | null) => {
      cleanup();

      if (child === current) child = undefined;

      if (settled || ready) return;

      settled = true;

      reject(
        new Error(
          `Xanix server exited before ready (code: ${code}, signal: ${signal})`,
        ),
      );
    };

    current.on("message", onMessage);
    current.once("error", onError);
    current.once("exit", onExit);
  });
}

export function startServer(): Promise<void> {
  restartQueue = restartQueue.then(startServerInternal);
  return restartQueue;
}
