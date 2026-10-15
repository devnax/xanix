import { XanixRoute } from "../../../types";
import { hydrate } from "svelte";

const renderSvelteClient = async (
  route: XanixRoute,
  data: Record<string, any>,
) => {
  const page = route.page as () => Promise<any>;
  const layouts = (route.layouts ?? []) as (() => Promise<any>)[];
  const promises = [page(), ...layouts.map((load) => load())];
  const [_page, ..._layouts] = await Promise.all(promises);

  let Root = _page.default;
  let rootProps: Record<string, any> = { ...data.props };
  for (const Layout of [..._layouts].reverse()) {
    rootProps = { Child: Root, childProps: rootProps };
    Root = Layout.default;
  }

  hydrate(Root, {
    target: document.body,
    props: rootProps,
    context: new Map<string, any>([]),
  });
};

export default renderSvelteClient;
