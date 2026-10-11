import { navigate } from "./navigate.js";
import outdirs from "./outdirs.js";

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
        try {
          await import(`/${outdirs.client}/${file}?t=${Date.now()}`);
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

// async function bootstrap() {
//   const win = window as any;
//   const doc = win.__XDOCUMENT;

//   if (doc?.page?.id && pages[doc.page.id]) {
//     const mod = await pages[doc.page.id]();
//     let win: any = window;
//     const windoc = win.__XDOCUMENT;
//     if (windoc && windoc.page && windoc.page.id) {
//       const pageData = win.__XPAGEDATA;
//       windoc.pagedata = pageData;
//       win.__XDOCUMENT = null;
//       win.__XPAGEDATA = null;
//       if (windoc.pagedata) {
//         for (const [key, value] of Object.entries(windoc.pagedata)) {
//           UseServerResult.set(key, value);
//         }
//       }
//       const root = createRoot(document.body as HTMLElement);
//       root.render(<AppRoot Component={mod.default} doc={windoc} />);
//     }
//   }
// }

// bootstrap();

window.addEventListener("load", navigate as any);
window.addEventListener("popstate", navigate as any);
