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

  // Rebuild the same nesting the server used: each layout renders <Child {...childProps} />
  let Root = _page.default;
  let rootProps: Record<string, any> = { ...data.props };
  for (const Layout of [..._layouts].reverse()) {
    rootProps = { Child: Root, childProps: rootProps };
    Root = Layout.default;
  }

  hydrate(Root, {
    target: document.body,
    props: rootProps,
    // Browser stand-in for the server's req so getContext("req") matches
    context: new Map<string, any>([
      [
        "req",
        {
          path: location.pathname,
          url: location.pathname + location.search,
          query: Object.fromEntries(new URLSearchParams(location.search)),
        },
      ],
      ["res", undefined],
    ]),
  });
};

export default renderSvelteClient;
