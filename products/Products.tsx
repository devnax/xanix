import React from "react";
import { navigate } from "../src/client";
import { Link } from "../src";

const Products = ({ products }: any) => {
  return (
    <div>
      <button onClick={() => navigate("/")}>Home</button>
      <Link href="/about" preload={true}>
        About
      </Link>
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
