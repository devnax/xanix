import outdirs from "../../../../outdirs";
import RefreshRuntime from "react-refresh/runtime";

const ws = new WebSocket("ws://localhost:49152");
const win: any = window;

RefreshRuntime.injectIntoGlobalHook(window);
win.$RefreshReg$ = (type: any, id: any) => RefreshRuntime.register(type, id);
win.$RefreshSig$ = RefreshRuntime.createSignatureFunctionForTransform;

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
