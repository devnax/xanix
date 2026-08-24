import Home from "./app/Home";
import About from "./app/about";
import express from "express";
import productsRouter from "./products/index.tsx";

const app = express();
app.use("/product", productsRouter);

app.get("/", (req, res) => {
  res.send(
    <Home
      name="John Deo"
      products={[
        { name: "Product 1", price: 10 },
        { name: "Product 2", price: 20 },
      ]}
      document={{
        metadata: {
          title: "Home Page",
          description: "This is the home page of our application.",
        },
        scripts: [
          {
            src: "/products/index.js",
            type: "module",
            placement: "head",
          },
        ],
        styles: [
          {
            href: "/products/index.css",
            placement: "head",
          },
        ],
      }}
    />,
  );
});

app.get("/about", (req, res) => {
  res.send(<About />);
});

// app.get("/contact", (req, res) => {
//   res.send(<Contact />);
// });

app.listen(3000, () => {
  console.log("Server is running on http://localhost:3000");
});
