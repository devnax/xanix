import "virtual:xanix-hrm";
import { XanixRoute } from "../../../types";
import { createElement } from "react";
import { hydrateRoot } from "react-dom/client";

const renderReactClient = async (
  route: XanixRoute,
  data: Record<string, any>,
) => {
  const page = route.page as () => Promise<any>;
  const layouts = (route.layouts ?? []) as (() => Promise<any>)[];
  const promises = [page(), ...layouts.map((load) => load())];
  const [_page, ..._layouts] = await Promise.all(promises);
  const element = _layouts.reduceRight(
    (children, Layout) => createElement(Layout.default, {}, children),
    createElement(_page.default, { ...data.props }),
  );

  const rootElement = document;
  hydrateRoot(rootElement, element);
};

export default renderReactClient;
