export const navigate = (path: string, replace = false) => {
  window.dispatchEvent(
    new CustomEvent("xanix:navigate", {
      detail: { path, replace },
    }),
  );
};

export const back = () => {
  window.history.back();
};

export const forward = () => {
  window.history.forward();
};

export const preload = async (path: string) => {
  window.dispatchEvent(new CustomEvent("xanix:preload", { detail: { path } }));
};

export const reload = (hard = false) => {
  if (hard) {
    window.location.reload();
    return;
  }
  window.dispatchEvent(new CustomEvent("xanix:reload"));
};

export const onNavigateStart = (callback: () => void) => {
  if (typeof window === "undefined") return;
  window.addEventListener("xanix:navigate:start", callback);
};

export const onNavigateEnd = (callback: () => void) => {
  if (typeof window === "undefined") return;
  window.addEventListener("xanix:navigate:end", callback);
};
