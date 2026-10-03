import RefreshRuntime from "react-refresh/runtime";
const getImportUrl = (file: string) => `/.xanix/client/${file}.js`;

if (__XANIX_DEV__) {
  RefreshRuntime.injectIntoGlobalHook(window);
  (window as any).$RefreshReg$ = (type: any, id: any) => {
    RefreshRuntime.register(type, id);
  };
  (window as any).$RefreshSig$ = () => (type: any) => type;

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
}
