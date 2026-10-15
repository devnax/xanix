import { renderToString } from "react-dom/server";
import type { EventMap } from "../../server-dep/types.js";
import type { Express } from "express";

type Platform = "express";

export interface XanixAsset {
  path: string;
  name: string;
  type: "css" | "js" | "image" | "font" | "other";
}

export const XanixAssets = new Map<string, XanixAsset>();

type RegisterRoute = {
  id: string;
  engine: Engine;
  path: string;
  route: Record<string, any>;
  middleware: Record<string, any>;
  page?: () => Promise<any>;
  layouts?: Array<() => Promise<any>>;
};

const xanix = (platform: Platform) => {
  if (__XANIX_SERVER__) {
    if (platform === "express") {
      const { default: xanix_express } = require("../server/express");
      return xanix_express();
    }
  }
};
import { createElement } from "react";
import { Engine } from "../../include/code/scanFileRoutes.js";
xanix.register = (app: Express, route: RegisterRoute) => {
  if (__XANIX_SERVER__) {
    if (route.route) {
      // Implement route registration logic here
    }

    if (route.page) {
      app.get(route.path, async (req, res) => {
        let layouts = route.layouts || [];
        const [pageModule, ...layoutModules] = await Promise.all([
          (route as any).page(),
          ...layouts.map((load) => load().then((mod) => mod.default)),
        ]);

        const element = layoutModules.reduceRight(
          (children, Layout) => createElement(Layout, { req, res }, children),
          createElement(pageModule.default, { req, res }),
        );

        res.send(renderToString(element));
      });
    }
  }
};

xanix.asset = (option: XanixAsset) => {
  XanixAssets.set(option.name, option);
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
