import { j as jsxRuntimeExports } from './jsx-runtime-BMrLYoZb.js';

const Products = ({ products }) => {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    "hello nice",
    /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { children: products.map((product, index) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { children: [
      product.name,
      " - $",
      product.price
    ] }, index)) })
  ] });
};

export { Products as default };
//# sourceMappingURL=products.js.map
