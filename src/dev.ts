import RefreshRuntime from "react-refresh/runtime";
import { getImportUrl } from "./client-runtime";

if (__XANIX_DEV__) {
  const win = window as any;
  const ws = new WebSocket("ws://localhost:49152");

  RefreshRuntime.injectIntoGlobalHook(win);
  win.$RefreshReg$ = (type: any, id: any) => {
    RefreshRuntime.register(type, id);
  };
  win.$RefreshSig$ = () => (type: any) => type;

  ws.onmessage = async (event) => {
    const files = JSON.parse(event.data);
    for (const file of files) {
      if (!file.endsWith(".js")) {
        continue;
      }
      const url = getImportUrl(file.replace(/\.js$/, "")) + "?t=" + Date.now();
      await import(url);
    }
    RefreshRuntime.performReactRefresh();
  };
}
