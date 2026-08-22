import { jsxs, jsx } from 'react/jsx-runtime';
import express, { Router } from 'express';
import { renderToString } from 'react-dom/server';
import React, { isValidElement, useEffect, Suspense } from 'react';

const xanix = () => {
  return async (_req, res, next) => {
    const originalSend = res.send.bind(res);
    res.send = async (component) => {
      if (typeof component !== "object" || !isValidElement(component)) {
        originalSend(component);
        return;
      }
      if (_req.query.static) {
        res.setHeader("Content-Type", "application/json");
        originalSend(
          JSON.stringify({
            source: "script.js",
            props: component.props
          })
        );
      } else {
        const html = renderToString(component);
        res.setHeader("Content-Type", "text/html");
        originalSend(
          `
        <!doctype html>
        <html>
          <head>
          </head>
          <body>
            <div>${html}</div>
            <script>
              window.__INITIAL_PROPS__ = ${JSON.stringify(component.props)};
            </script>
          </body>
        </html>
      `
        );
      }
    };
    next();
  };
};

const app = express();
app.use(xanix());
app.listen(3e3, () => {
  console.log("Server is running on http://localhost:3000");
});

const Home = ({ name, products }) => {
  const [count, setCount] = React.useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setCount((prevCount) => prevCount + 1);
    }, 1e3);
    return () => clearInterval(interval);
  }, []);
  return /* @__PURE__ */ jsxs("div", { children: [
    name,
    " ",
    count,
    /* @__PURE__ */ jsx("ul", { children: products.map((product, index) => /* @__PURE__ */ jsxs("li", { children: [
      product.name,
      " - $",
      product.price
    ] }, index)) })
  ] });
};

const Chunk$2 = React.lazy(() => Promise.resolve().then(function () { return Chunk$1; }));
const About = () => {
  return /* @__PURE__ */ jsxs("div", { children: [
    "About Page",
    /* @__PURE__ */ jsx(Suspense, { fallback: /* @__PURE__ */ jsx("div", { children: "Loading..." }), children: /* @__PURE__ */ jsx(Chunk$2, {}) })
  ] });
};

const Contact = () => {
  return /* @__PURE__ */ jsx("div", { children: "Contact Page" });
};

const Products = ({ products }) => {
  return /* @__PURE__ */ jsxs("div", { children: [
    "hello nice",
    /* @__PURE__ */ jsx("ul", { children: products.map((product, index) => /* @__PURE__ */ jsxs("li", { children: [
      product.name,
      " - $",
      product.price
    ] }, index)) })
  ] });
};

const productRouter = Router();
productRouter.get("/products", (req, res) => {
  const products = [
    { name: "Product 1", price: 10 },
    { name: "Product 2", price: 20 },
    { name: "Product 3", price: 30 }
  ];
  res.send(/* @__PURE__ */ jsx(Products, { products }));
});

app.use("/products", productRouter);
app.get("/", (req, res) => {
  res.send(
    /* @__PURE__ */ jsx(
      Home,
      {
        name: "John Doe",
        count: 5,
        products: [
          { name: "Product 1", price: 10 },
          { name: "Product 2", price: 20 }
        ]
      }
    )
  );
});
app.get("/about", (req, res) => {
  res.send(/* @__PURE__ */ jsx(About, {}));
});
app.get("/contact", (req, res) => {
  res.send(/* @__PURE__ */ jsx(Contact, {}));
});

const Chunk = () => {
  return /* @__PURE__ */ jsx("div", { children: "Chunk Component" });
};

var Chunk$1 = /*#__PURE__*/Object.freeze({
  __proto__: null,
  default: Chunk
});
//# sourceMappingURL=server.js.map
