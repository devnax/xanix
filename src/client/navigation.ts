export const navigate = (path: string) => {
  window.dispatchEvent(
    new CustomEvent("xanix:navigate", {
      detail: { path },
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
