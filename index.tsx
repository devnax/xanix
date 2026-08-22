import { app } from "./src/app.js";
import Home from "./app/Home.js";
import About from "./app/about/index.js";
import Contact from "./app/Contact.js";

import productsRouter from "./products/index.tsx";
app.use("/products", productsRouter);

app.get("/", (req, res) => {
  res.send(
    <Home
      name="John Doe"
      count={5}
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

app.get("/contact", (req, res) => {
  res.send(<Contact />);
});
