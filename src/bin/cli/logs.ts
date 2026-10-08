import pc from "picocolors";
import { access, stat } from "fs/promises";
import { createReadStream, watch, type FSWatcher } from "fs";
import path from "path";
import crypto from "crypto";
import { xanixLogs } from "../include/path.js";

const logs = async () => {
  const projectId = crypto
    .createHash("sha256")
    .update(process.cwd())
    .digest("hex")
    .slice(0, 16);

  const logDir = path.join(xanixLogs, projectId);
  const stdoutFile = path.join(logDir, "stdout.log");
  const stderrFile = path.join(logDir, "stderr.log");
  console.log("");
  console.log(pc.cyan(pc.bold("Xanix logs")));
  console.log(pc.gray("Press Ctrl+C to exit."));
  console.log("");

  let stdoutPosition = 0;
  let stderrPosition = 0;
  let stdoutWatcher: FSWatcher | undefined;
  let stderrWatcher: FSWatcher | undefined;
  let readingStdout = false;
  let readingStderr = false;

  const readNewData = async (
    filePath: string,
    position: number,
    output: NodeJS.WriteStream,
  ) => {
    try {
      const file = await stat(filePath);

      // Log was truncated.
      if (file.size < position) {
        position = 0;
      }

      if (file.size === position) {
        return position;
      }

      const newPosition = file.size;
      const stream = createReadStream(filePath, {
        start: position,
        end: newPosition - 1,
      });

      await new Promise<void>((resolve, reject) => {
        stream.on("data", (chunk) => {
          output.write(chunk);
        });
        stream.on("end", resolve);
        stream.on("error", reject);
      });

      return newPosition;
    } catch {
      return position;
    }
  };

  const updateStdout = async () => {
    if (readingStdout) {
      return;
    }

    readingStdout = true;
    try {
      stdoutPosition = await readNewData(
        stdoutFile,
        stdoutPosition,
        process.stdout,
      );
    } finally {
      readingStdout = false;
    }
  };

  const updateStderr = async () => {
    if (readingStderr) {
      return;
    }

    readingStderr = true;
    try {
      stderrPosition = await readNewData(
        stderrFile,
        stderrPosition,
        process.stderr,
      );
    } finally {
      readingStderr = false;
    }
  };

  const watchStdout = async () => {
    if (stdoutWatcher) {
      return;
    }

    try {
      await access(stdoutFile);
      stdoutPosition = 0;
      // Print existing logs.
      await updateStdout();
      stdoutWatcher = watch(stdoutFile, () => {
        void updateStdout();
      });
    } catch {
      // File does not exist yet.
    }
  };

  const watchStderr = async () => {
    if (stderrWatcher) {
      return;
    }

    try {
      await access(stderrFile);
      stderrPosition = 0;
      // Print existing errors.
      await updateStderr();
      stderrWatcher = watch(stderrFile, () => {
        void updateStderr();
      });
    } catch {
      // File does not exist yet.
    }
  };

  // Try immediately.
  await watchStdout();
  await watchStderr();

  // If `xanix logs` starts before `xanix start`,
  // keep checking until the log files appear.
  const interval = setInterval(() => {
    if (!stdoutWatcher) {
      void watchStdout();
    }

    if (!stderrWatcher) {
      void watchStderr();
    }
  }, 500);

  const cleanup = () => {
    clearInterval(interval);
    stdoutWatcher?.close();
    stderrWatcher?.close();
    process.exit(0);
  };

  process.once("SIGINT", cleanup);
  process.once("SIGTERM", cleanup);

  // Keep xanix logs alive.
  await new Promise<void>(() => {});
};

export default logs;
