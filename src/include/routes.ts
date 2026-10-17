import type { Engine } from "./code/scanFileRoutes.js";

export const getEngineById = (id: string): Engine => {
  const ext = id.split(".").pop() as string;
  if (["ejs", "hbs", "pug", "vue", "svelte", "html"].includes(ext)) {
    return ext as Engine;
  }
  return "react";
};
