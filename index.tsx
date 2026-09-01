import Home from "./example/Home";
import About from "./example/about";
import express from "express";
import productsRouter from "./example/products";
import ErrorPage from "./example/Error";

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

  return;
});

app.get("/about", (req, res) => {
  res.send(<About />);
});

// app.get(/.*/, (req, res) => {
//   res.status(404).send(<ErrorPage />);
// });

app.listen(3000, () => {
  console.log("Server is running on http://localhost:3000");
});
