import RefreshRuntime from "react-refresh/runtime";

const win: any = window;

RefreshRuntime.injectIntoGlobalHook(window);
win.$RefreshReg$ = (type: any, id: any) => RefreshRuntime.register(type, id);
win.$RefreshSig$ = RefreshRuntime.createSignatureFunctionForTransform;
