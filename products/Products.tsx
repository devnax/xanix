import React from "react";
import { Link, navigate } from "../src/client";

const Products = ({ products }: any) => {
  return (
    <div>
      <button onClick={() => navigate("/")}>Home</button>
      <Link href="/about">About s</Link>
      <ul>
        {products.map((product: any, index: number) => (
          <li key={index}>
            {product.name} - ${product.price}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Products;
