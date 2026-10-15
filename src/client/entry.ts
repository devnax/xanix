import routes from "virtual:xanix-route";

window.addEventListener("DOMContentLoaded", async () => {
  const props = window.__XANIX_DATA__;
  const route = routes.find((r) => r.path === props.path);
  if (route) {
    const render = (await route.engine()).default;
    render(route, props);
  }
});
