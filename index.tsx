import Home from "./app/Home";
import About from "./app/about";
import express from "express";
import productsRouter from "./products/index.tsx";

const app = express();
app.use("/product", productsRouter);

app.get("/", (req, res) => {
  req.page.setTitle("Home Page");
  req.page.setMeta("name", "Nax");

  res.send(
    <Home
      name="John Deo"
      products={[
        { name: "Product 1", price: 10 },
        { name: "Product 2", price: 20 },
      ]}
    />,
  );
});

app.get("/about", (req, res) => {
  res.send(<About />);
});

app.listen(3000, () => {
  console.log("Server is running on http://localhost:3000");
});
