import pc from "picocolors";
import start from "./start.js";
import stop from "./stop.js";

const restart = async () => {
  console.log("");
  console.log(pc.cyan(pc.bold("Restarting Xanix server...")));
  console.log("");

  await stop();
  await start({});
};

export default restart;
