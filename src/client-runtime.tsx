import { navigate } from "./navigate.js";
import outdirs from "./outdirs.js";

export const getImportUrl = (file: string) => `/${outdirs.client}/${file}.js`;

if (__XANIX_DEV__) {
  const win: any = window;

  import("react-refresh/runtime").then((RefreshRuntime) => {
    RefreshRuntime.injectIntoGlobalHook(win);

    win.$RefreshReg$ = (type: any, id: any) => {
      RefreshRuntime.register(type, id);
    };

    win.$RefreshSig$ = RefreshRuntime.createSignatureFunctionForTransform;
    const ws = new WebSocket("ws://localhost:49152");

    ws.onmessage = async (event) => {
      const files: string[] = JSON.parse(event.data);
      for (const file of files) {
        if (!file.endsWith(".js")) continue;
        const url = getImportUrl(file.replace(/\.js$/, ""));

        try {
          await import(`${url}?t=${Date.now()}`);
        } catch (error) {
          console.error("[Xanix HMR] Module update failed:", file, error);
          window.location.reload();
          return;
        }
      }

      try {
        RefreshRuntime.performReactRefresh();
        ws.send("reload");
      } catch (error) {
        console.error("[Xanix HMR] Refresh failed:", error);
        window.location.reload();
      }
    };
  });
}

window.addEventListener("load", navigate as any);
window.addEventListener("popstate", navigate as any);
