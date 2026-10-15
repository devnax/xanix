import { XanixRoute } from "../../../types";
import { createSSRApp, h } from "vue";

const renderVueClient = async (
  route: XanixRoute,
  data: Record<string, any>,
) => {
  const page = route.page as () => Promise<any>;
  const layouts = (route.layouts ?? []) as (() => Promise<any>)[];

  const [pageModule, ...layoutModules] = await Promise.all([
    page(),
    ...layouts.map((load) => load()),
  ]);

  const tree = () =>
    layoutModules.reduceRight(
      (children, Layout) =>
        h(Layout.default, null, { default: () => children }),
      h(pageModule.default, { ...data.props }),
    );

  const app = createSSRApp({ render: tree });

  app.provide("req", undefined);
  app.provide("res", undefined);

  const root = document.getElementById("xanix-root") || document.body;

  if (!root) {
    throw new Error('Xanix: Missing "#xanix-root" hydration element.');
  }

  app.mount(root);
};

export default renderVueClient;
