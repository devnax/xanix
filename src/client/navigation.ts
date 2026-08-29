import { getImportUrl, getPage, getPath, mount } from "./runtime";

let history: string[] = [];
let currentIndex = -1;
const XANIX_NAVIGATION = "xanix:navigate";

const fire = (path: string) => {
  window.history.pushState(null, "", path);
  window.dispatchEvent(
    new CustomEvent(XANIX_NAVIGATION, {
      detail: { path },
    }),
  );
};

export const navigate = async (path: string) => {
  // history = history.slice(0, currentIndex + 1);
  // history.push(path);
  // currentIndex++;
  fire(path);
};

export const back = async () => {
  if (currentIndex > 0) {
    currentIndex--;
    const path = history[currentIndex];
    fire(path);
  }
};

export const forward = async () => {
  if (currentIndex < history.length - 1) {
    currentIndex++;
    const path = history[currentIndex];
    fire(path);
  }
};
