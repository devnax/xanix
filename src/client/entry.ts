import routes from "virtual:xanix-route";
import outdirs from "../include/outdirs.js";

window.addEventListener("DOMContentLoaded", async () => {
  const props = window.__XANIX_DATA__;
  const route = routes.find((r) => r.path === props.path);
  if (route) {
    const render = (await route.engine()).default;
    render(route, props);
  }
});

if (__XANIX_DEV__) {
  const ws = new WebSocket("ws://localhost:49152");
  ws.onmessage = async (event) => {
    const files: { file: string; id: string }[] = JSON.parse(event.data);
    let refresh = false;

    for (const { file, id } of files) {
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
          // window.location.reload();
          return;
        }
      }
    }

    // try {
    //   if (refresh) {
    //     (window as any).RefreshRuntime.performReactRefresh();
    //     ws.send("reload");
    //   }
    // } catch (error) {
    //   console.error("[Xanix HMR] Refresh failed:", error);
    //   window.location.reload();
    // }
  };
}
