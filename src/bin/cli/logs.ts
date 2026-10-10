import pc from "picocolors";
import { stat, open, writeFile } from "fs/promises";
import { watchFile, unwatchFile, type Stats } from "fs";
import { getProcess, processFiles } from "../include/process.js";
import { getFrameworkPackageJson } from "../include/utils.js";

type LogLevel = "INFO" | "WARN" | "ERROR" | "DEBUG" | "HTTP";

const LEVEL_COLORS: Record<LogLevel, (text: string) => string> = {
  INFO: pc.green,
  WARN: pc.yellow,
  ERROR: pc.red,
  DEBUG: pc.magenta,
  HTTP: pc.blue,
};

const logs = async () => {
  const packageJson = await getFrameworkPackageJson();

  // delete previous log files if they exist

  console.log("");
  console.log(
    `${pc.cyan(pc.bold("Xanix"))} ${pc.gray(`v${packageJson.version}`)}`,
  );
  console.log("");

  const activeProcess = await getProcess();

  if (!activeProcess) {
    printStopped();
    return;
  }

  const pid = Number(activeProcess.pid);

  if (!Number.isInteger(pid) || pid <= 0) {
    printStopped();
    return;
  }

  try {
    process.kill(pid, 0);
  } catch {
    printStopped();
    return;
  }

  console.log(`${pc.green("●")} ${pc.green("RUNNING")}`);
  console.log("");
  console.log(`${pc.gray("PID")}       ${pc.white(String(pid))}`);
  console.log(`${pc.gray("Mode:")}     ${pc.white("production")}`);
  console.log("");
  console.log(`${pc.gray("press ctrl+c to exit")}`);
  console.log("");

  const stdoutFile = processFiles.logs.stdout;
  const stderrFile = processFiles.logs.stderr;
  await writeFile(stdoutFile, "", { flag: "w" });
  await writeFile(stderrFile, "", { flag: "w" });

  await watchLogFiles(stdoutFile, stderrFile);
};

function printStopped(): void {
  console.log(`${pc.gray("●")} Xanix server ${pc.gray("stopped")}`);
  console.log("");
  console.log(pc.gray(`Run ${pc.cyan("xanix start")} to start the server.`));
  console.log("");
}

function getTimestamp(): string {
  return new Date().toLocaleTimeString("en-GB", {
    hour12: false,
  });
}

function detectLogLevel(message: string, isStderr: boolean): LogLevel {
  const text = message.trim();

  if (/\b(error|fatal|exception|uncaught|unhandled rejection)\b/i.test(text)) {
    return "ERROR";
  }

  if (/\b(warn|warning)\b/i.test(text)) {
    return "WARN";
  }

  if (
    /\b(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\s+\/\S*\s+\d{3}\b/i.test(
      text,
    ) ||
    /\bHTTP(?:\/\d(?:\.\d)?)?\s+\d{3}\b/i.test(text)
  ) {
    return "HTTP";
  }

  if (/\b(debug|trace|verbose)\b/i.test(text)) {
    return "DEBUG";
  }

  if (/\b(info|success)\b/i.test(text)) {
    return "INFO";
  }

  return isStderr ? "ERROR" : "INFO";
}

function formatLogLine(message: string, isStderr: boolean): string {
  const level = detectLogLevel(message, isStderr);
  const color = LEVEL_COLORS[level];

  return `${pc.gray(getTimestamp())} ${color(level.padEnd(5))} ${message}`;
}

async function watchLogFiles(
  stdoutFile: string,
  stderrFile: string,
): Promise<void> {
  let stdoutSize = 0;
  let stderrSize = 0;

  let stdoutBusy = false;
  let stderrBusy = false;
  let closed = false;

  let stdoutPending = "";
  let stderrPending = "";

  const watchers: {
    filePath: string;
    listener: (curr: Stats, prev: Stats) => void;
  }[] = [];

  const printNewContent = (content: string, isStderr: boolean): void => {
    const pending = isStderr ? stderrPending : stdoutPending;
    const lines = (pending + content).split("\n");
    const remainder = lines.pop() ?? "";

    if (isStderr) {
      stderrPending = remainder;
    } else {
      stdoutPending = remainder;
    }

    for (const rawLine of lines) {
      const line = rawLine.endsWith("\r") ? rawLine.slice(0, -1) : rawLine;

      process.stdout.write(formatLogLine(line, isStderr) + "\n");
    }
  };

  const flushPending = (isStderr: boolean): void => {
    const pending = isStderr ? stderrPending : stdoutPending;

    if (!pending) {
      return;
    }

    process.stdout.write(formatLogLine(pending, isStderr) + "\n");

    if (isStderr) {
      stderrPending = "";
    } else {
      stdoutPending = "";
    }
  };

  const readNewContent = async (
    filePath: string,
    getSize: () => number,
    setSize: (size: number) => void,
    isStderr: boolean,
    isBusy: () => boolean,
    setBusy: (busy: boolean) => void,
  ): Promise<void> => {
    if (closed || isBusy()) {
      return;
    }

    setBusy(true);

    try {
      const stats = await stat(filePath);

      if (stats.size < getSize()) {
        setSize(0);

        if (isStderr) {
          stderrPending = "";
        } else {
          stdoutPending = "";
        }
      }

      if (stats.size <= getSize()) {
        return;
      }

      const offset = getSize();
      const length = stats.size - offset;
      const handle = await open(filePath, "r");

      try {
        const buffer = Buffer.alloc(length);

        const { bytesRead } = await handle.read(buffer, 0, length, offset);

        if (bytesRead > 0 && !closed) {
          printNewContent(buffer.toString("utf8", 0, bytesRead), isStderr);

          setSize(offset + bytesRead);
        }
      } finally {
        await handle.close();
      }
    } catch {
      // Ignore temporary file access errors.
    } finally {
      setBusy(false);

      if (!closed) {
        try {
          const stats = await stat(filePath);

          if (stats.size > getSize()) {
            void readNewContent(
              filePath,
              getSize,
              setSize,
              isStderr,
              isBusy,
              setBusy,
            );
          }
        } catch {
          // The file may temporarily be unavailable.
        }
      }
    }
  };

  const stdoutListener = (curr: Stats, prev: Stats) => {
    if (curr.size !== prev.size || curr.mtimeMs !== prev.mtimeMs) {
      void readNewContent(
        stdoutFile,
        () => stdoutSize,
        (size) => {
          stdoutSize = size;
        },
        false,
        () => stdoutBusy,
        (busy) => {
          stdoutBusy = busy;
        },
      );
    }
  };

  const stderrListener = (curr: Stats, prev: Stats) => {
    if (curr.size !== prev.size || curr.mtimeMs !== prev.mtimeMs) {
      void readNewContent(
        stderrFile,
        () => stderrSize,
        (size) => {
          stderrSize = size;
        },
        true,
        () => stderrBusy,
        (busy) => {
          stderrBusy = busy;
        },
      );
    }
  };

  const cleanup = () => {
    if (closed) {
      return;
    }

    closed = true;

    for (const watcher of watchers) {
      unwatchFile(watcher.filePath, watcher.listener);
    }

    flushPending(false);
    flushPending(true);

    process.off("SIGINT", onSigint);
    process.off("SIGTERM", cleanup);
  };

  const onSigint = () => {
    cleanup();

    console.log("");
    console.log(pc.gray("Logs closed."));
    console.log("");

    process.exit(0);
  };

  const [stdoutStats, stderrStats] = await Promise.all([
    stat(stdoutFile).catch(() => null),
    stat(stderrFile).catch(() => null),
  ]);

  stdoutSize = stdoutStats?.size ?? 0;
  stderrSize = stderrStats?.size ?? 0;

  watchers.push(
    { filePath: stdoutFile, listener: stdoutListener },
    { filePath: stderrFile, listener: stderrListener },
  );

  watchFile(stdoutFile, { interval: 200 }, stdoutListener);
  watchFile(stderrFile, { interval: 200 }, stderrListener);

  process.once("SIGINT", onSigint);
  process.once("SIGTERM", cleanup);
}

export default logs;
