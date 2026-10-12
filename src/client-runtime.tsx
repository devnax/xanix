import { navigate } from "./navigate.js";
import outdirs from "./outdirs.js";

window.addEventListener("load", navigate as any);
window.addEventListener("popstate", navigate as any);

if (__XANIX_DEV__) {
  import("react-refresh/runtime").then((RefreshRuntime) => {
    const win: any = window;
    RefreshRuntime.injectIntoGlobalHook(win);

    win.$RefreshReg$ = (type: any, id: any) =>
      RefreshRuntime.register(type, id);

    win.$RefreshSig$ = RefreshRuntime.createSignatureFunctionForTransform;
    const ws = new WebSocket("ws://localhost:49152");

    ws.onmessage = async (event) => {
      const files: string[] = JSON.parse(event.data);
      let refresh = false;

      for (const file of files) {
        if (file.endsWith(".css")) {
          const link = document.createElement("link");
          link.rel = "stylesheet";
          link.type = "text/css";
          link.href = `${file}?t=${Date.now()}`;
          document.head.appendChild(link);
          continue;
        }

        if (file.endsWith(".js")) {
          try {
            await import(`/${outdirs.client}/${file}?t=${Date.now()}`);
            refresh = true;
          } catch (error) {
            console.error("[Xanix HMR] Module update failed:", file, error);
            window.location.reload();
            return;
          }
        }
      }

      try {
        if (refresh) {
          RefreshRuntime.performReactRefresh();
          ws.send("reload");
        }
      } catch (error) {
        console.error("[Xanix HMR] Refresh failed:", error);
        window.location.reload();
      }
    };
  });
}
