import routes from "virtual:xanix-route";
import outdirs from "../include/outdirs.js";
import { getEngineById } from "../include/routes.js";
import { render } from "./Route.js";

window.addEventListener("DOMContentLoaded", async () => {
  const props = window.__XANIX_DATA__;
  const route = routes.find((r) => r.path === props.path);
  if (route) {
    render({ route, mode: "hydration" });
  }
});

if (__XANIX_DEV__) {
  const hots = new Map();
  (window as any).__xanix_createHot = (id: string) => {
    const key = id.split("?")[0];
    return {
      accept(cb: Function) {
        const has = Array.from(hots.values()).includes(cb);
        if (!hots.has(key) && !has) {
          hots.set(key, cb);
        }
      },
    };
  };

  const ws = new WebSocket("ws://localhost:49152");
  ws.onmessage = async (event) => {
    const files: { file: string; id: string }[] = JSON.parse(event.data);

    for (const { file, id } of files) {
      if (file.endsWith(".css")) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.type = "text/css";
        link.href = `${file}?t=${Date.now()}`;
        document.head.appendChild(link);
        continue;
      }

      const engine = getEngineById(id);

      if (["hbs", "ejs", "pug", "html"].includes(engine)) {
        try {
          const currentUrl = window.location.href;
          const res = await fetch(currentUrl);
          if (!res.ok) {
            throw new Error(`Failed to fetch ${file}`);
          }
          const html = await res.text();
          document.documentElement.innerHTML = html;
        } catch (error) {
          console.error("[Xanix HMR] Failed to fetch HTML:", file, error);
          window.location.reload();
        }
      } else {
        try {
          const url = `/${outdirs.client}/${file}?t=${Date.now()}`;
          if (engine === "react") {
            await import(url);
            (window as any).RefreshRuntime.performReactRefresh();
          } else if (engine === "vue") {
            const mod = await import(url);
            const hmr = (window as any).__VUE_HMR_RUNTIME__;
            const comp = mod.default;
            const hmrId = comp?.__hmrId;
            if (hmr && hmrId) {
              hmr.reload(hmrId, comp);
            }
          } else if (engine === "svelte") {
            const key = id.split("?")[0];
            const callback = hots.get(key);
            hots.clear();
            const mod = await import(url);
            if (callback) {
              callback(mod);
            }
          }
          ws.send(JSON.stringify({ type: "reload", engine }));
        } catch (error) {
          console.error("[Xanix HMR] Module update failed:", file, error);
          // window.location.reload();
          return;
        }
      }
    }
  };
}
