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

export interface XanixAsset {
  path: string;
  name: string;
  type: "css" | "js" | "image" | "font" | "other";
}

export const XanixAssets = new Map<string, XanixAsset>();
xanix.asset = (option: XanixAsset) => {
  if (__XANIX_SERVER__) {
    XanixAssets.set(option.name, option);
  }

  return {
    type: option.type,
    src: `assets/${option.name}`,
  };
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

xanix.off = (event: keyof EventMap, callback: Function) => {
  if (!eventCallbacks[event]) {
    return;
  }
  const index = eventCallbacks[event].indexOf(callback);
  if (index !== -1) {
    eventCallbacks[event].splice(index, 1);
  }
};

xanix.emit = <T extends keyof EventMap>(event: T, args?: EventMap[T]) => {
  if (!eventCallbacks[event]) {
    return;
  }
  for (const callback of eventCallbacks[event]) {
    callback(args);
  }
};

export default xanix;
