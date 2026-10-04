import XanixRedirect from "./classes/XanixRedirect.js";
import xanix from "./server/index.js";

export const navigate = (
  path: string,
  options?: { replace?: boolean; status?: number },
) => {
  if (__XANIX_CLIENT__) {
    xanix.emit("navigate", { path, replace: options?.replace });
  } else {
    throw new XanixRedirect(options?.status ?? 302, path);
  }
};

export const back = () => window.history.back();
export const forward = () => window.history.forward();
export const preload = async (path: string) => {
  xanix.emit("preload", path);
};

export const reload = (hard = false) => {
  if (__XANIX_CLIENT__) {
    if (hard) {
      window.location.reload();
    } else {
      xanix.emit("reload");
    }
  }
};

export const onNavigateStart = (callback: () => void) => {
  if (__XANIX_CLIENT__) {
    window.addEventListener(XANIX_NAVIGATE_START, callback);
  }
};

export const onNavigateEnd = (callback: () => void) => {
  if (__XANIX_CLIENT__) {
    window.addEventListener(XANIX_NAVIGATE_END, callback);
  }
};
