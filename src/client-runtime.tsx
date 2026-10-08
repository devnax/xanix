import { navigate } from "./navigate.js";
// import RefreshRuntime from "react-refresh/runtime";
import outdirs from "./outdirs.js";

export const getImportUrl = (file: string) => `/${outdirs.client}/${file}.js`;

if (__XANIX_DEV__) {
  const win: any = window;
  import("react-refresh/runtime").then((RefreshRuntime) => {
    RefreshRuntime.injectIntoGlobalHook(win);
    win.$RefreshReg$ = (type: any, id: any) => {
      RefreshRuntime.register(type, id);
    };
    win.$RefreshSig$ = () => (type: any) => type;

    const ws = new WebSocket("ws://localhost:49152");

    ws.onmessage = async (event) => {
      const files = JSON.parse(event.data);
      for (const file of files) {
        if (!file.endsWith(".js")) {
          continue;
        }
        const url = getImportUrl(file.replace(/\.js$/, ""));
        await import(`${url}?t=${Date.now()}`);
      }

      RefreshRuntime.performReactRefresh();
    };
  });
}

window.addEventListener("load", navigate as any);
window.addEventListener("popstate", navigate as any);
