import pc from "picocolors";

const logger = {
  info: (msg: string, title = "xanix") =>
    console.log(`${pc.blue(`${title}`)} ${msg}`),
  warn: (msg: string, title = "xanix:warning") =>
    console.log(`${pc.yellow(`${title}`)} ${pc.yellow(msg)}`),
  error: (msg: string, title = "xanix:error") =>
    console.log(`${pc.red(`${title}`)} ${pc.red(msg)}`),
  success: (msg: string, title = "xanix:success") =>
    console.log(`${pc.green(`${title}`)} ${msg}`),
};

export default logger;
