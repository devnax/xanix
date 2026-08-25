import { navigate as navigateClient } from "./runtime-client.js";
export const navigate = async (path: string) => await navigateClient(path);

export const back = async () => {
  if (typeof window !== "undefined" && window.history.length > 1) {
    window.history.back();
  } else {
    console.warn("No history to go back to.");
  }
};

export const forward = async () => {
  if (typeof window !== "undefined" && window.history.length > 1) {
    window.history.forward();
  } else {
    console.warn("No history to go forward to.");
  }
};
