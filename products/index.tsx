import { Router } from "express";
import Products from "./Products";

const productRouter = Router();

productRouter.get("/", (req, res) => {
  const products = [
    { name: "Product 1", price: 10 },
    { name: "Product 2", price: 20 },
    { name: "Product 3", price: 30 },
  ];
  res.send(<Products products={products} />);
});

export default productRouter;
