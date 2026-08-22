import React from "react";

const Products = ({ products }: any) => {
  return (
    <div>
      hello nice
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
