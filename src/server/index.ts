import type { EventMap } from "./types.js";

type Platform = "express";
const xanix = (platform: Platform) => {
  if (__XANIX_SERVER__) {
    if (platform === "express") {
      const { default: xanix_express } = require("./express");
      return xanix_express();
    }
  }
};

const eventCallbacks: Record<string, Function[]> = {};

xanix.on = (event: keyof EventMap, callback: Function) => {
  if (!eventCallbacks[event]) {
    eventCallbacks[event] = [];
  }
  if (eventCallbacks[event].includes(callback)) {
    return;
  }
  eventCallbacks[event].push(callback);
};

xanix.emit = <T extends keyof EventMap>(event: T, args: EventMap[T]) => {
  if (!eventCallbacks[event]) {
    return;
  }
  for (const callback of eventCallbacks[event]) {
    callback(args);
  }
};

export default xanix;
