import { XanixRoute } from "virtual:xanix-route";

let current: null | XanixRoute = null;
export const render = async ({ route, mode }: any) => {
  const { render } = await route.renderer();
  render({ route, mode }, current);
  current = route;
};

export const exit = async () => {
  if (current) {
    const { onExit } = await current.renderer();
    await onExit(current);
  }
};
