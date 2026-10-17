import { RenderContext } from "virtual:xanix-route";
import { navigate } from "../../../libs/navigate.js";
import { exit } from "../../Route.js";

export const onExit = () => {};

export const render = async ({ route, mode }: RenderContext) => {
  if (mode === "navigation") {
    const res = await fetch(route.path);
    const path = res.headers.get("path");
    const html = await res.text();
    await exit();

    document.documentElement.innerHTML = html;
    history.pushState(null, "", path);
  }

  const anchors = document.querySelectorAll("a");
  anchors.forEach((anchor) => {
    anchor.addEventListener("click", async (event) => {
      event.preventDefault();
      const href = anchor.getAttribute("href");
      if (href) {
        await navigate(href);
      }
    });
  });
  window.__XANIX_DATA__ = null as any;
};
