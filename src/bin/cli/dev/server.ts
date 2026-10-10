import path from "node:path";
import { spawn } from "node:child_process";
import pc from "picocolors";
import outdirs from "../../../outdirs.js";

const serverInfo: { port?: number; url?: string } = {};
let child: any;
let firstStart = false;

async function stopCurrentServer(): Promise<void> {
  if (!child || child.exitCode !== null || child.signalCode !== null) {
    child = undefined;
    return;
  }

  const previous = child;

  await new Promise<void>((resolve) => {
    previous.once("exit", () => resolve());
    previous.kill();
  });

  if (child === previous) {
    child = undefined;
  }
}

export async function startServer(): Promise<void> {
  await stopCurrentServer();

  const filePath = path.join(outdirs.server, "index.js");

  await new Promise<void>((resolve, reject) => {
    const current = spawn(process.execPath, [filePath], {
      stdio: ["inherit", "inherit", "inherit", "ipc"],
    });

    child = current;

    const cleanup = () => {
      current.off("message", onMessage);
      current.off("error", onError);
      current.off("exit", onExit);
    };

    const onMessage = (message: any) => {
      if (message?.type !== "xanix:ready") return;

      serverInfo.port = message.port;
      serverInfo.url = message.url;

      if (!firstStart) {
        firstStart = true;

        console.log("");
        console.log(
          `  ${pc.blue("➜ Listening on:")} ${pc.yellow(serverInfo.url)}`,
        );
        console.log("");
      }

      cleanup();
      resolve();
    };

    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };

    const onExit = (code: number | null, signal: NodeJS.Signals | null) => {
      cleanup();

      if (child === current) {
        child = undefined;
      }

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
