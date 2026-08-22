import { j as jsxRuntimeExports } from './jsx-runtime-BMrLYoZb.js';
import { R as React, r as reactExports } from './index-DgGkw-OG.js';

const metadata = {
  title: "Home Page",
  description: "This is the home page of our application."
};
const Home = ({ name, products }) => {
  const [count, setCount] = React.useState(0);
  reactExports.useEffect(() => {
    const interval = setInterval(() => {
      setCount((prevCount) => prevCount + 1);
    }, 1e3);
    return () => clearInterval(interval);
  }, []);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    name,
    " ",
    count,
    /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { children: products.map((product, index) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { children: [
      product.name,
      " - $",
      product.price
    ] }, index)) })
  ] });
};

export { Home as default, metadata };
//# sourceMappingURL=home.js.map
