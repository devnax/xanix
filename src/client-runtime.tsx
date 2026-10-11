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
      let moduleChaned = false;
      for (const file of files) {
        if (file.endsWith(".css")) {
          const link = document.createElement("link");
          link.rel = "stylesheet";
          link.type = "text/css";
          link.id = file;
          link.href = `${file}?t=${Date.now()}`;
          document.head.appendChild(link);
          continue;
        }

        if (!file.endsWith(".js")) continue;
        const url = getImportUrl(file.replace(/\.js$/, ""));

        try {
          await import(`${url}?t=${Date.now()}`);
          moduleChaned = true;
        } catch (error) {
          console.error("[Xanix HMR] Module update failed:", file, error);
          window.location.reload();
          return;
        }
      }

      try {
        if (moduleChaned) {
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

window.addEventListener("load", navigate as any);
window.addEventListener("popstate", navigate as any);
