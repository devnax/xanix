import pc from "picocolors";

const logger = {
  info: (msg: string, title = "xanix") =>
    console.log(`${pc.blue(`[${title}]`)} ${msg}`),
  warn: (msg: string) =>
    console.log(`${pc.yellow("[xanix:warn]")} ${pc.yellow(msg)}`),
  error: (msg: string) =>
    console.log(`${pc.red("[xanix:error]")} ${pc.red(msg)}`),
  warnOnce: (msg: string) =>
    console.log(`${pc.yellow("[xanix:warn]")} ${pc.yellow(msg)}`),
  clearScreen: () => {},
  hasErrorLogged: () => false,
  hasWarned: false,
};

export default logger;
