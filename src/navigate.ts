export const navigate = (path: string, replace = false) => {
  window.dispatchEvent(
    new CustomEvent(XANIX_NAVIGATE, {
      detail: { path, replace },
    }),
  );
};

export const back = () => window.history.back();
export const forward = () => window.history.forward();
export const preload = async (path: string) => {
  window.dispatchEvent(new CustomEvent(XANIX_PRELOAD, { detail: { path } }));
};

export const reload = (hard = false) => {
  if (__XANIX_CLIENT__) {
    if (hard) {
      window.location.reload();
    } else {
      window.dispatchEvent(new CustomEvent(XANIX_NAVIGATE_RELOAD));
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
