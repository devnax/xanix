import React, { useEffect } from "react";
import { XanixPageProps } from "xanix";

export type HomeProps = XanixPageProps & {
  name: string;
  products: Array<{
    name: string;
    price: number;
  }>;
};

const Home = ({ name, products, document }: HomeProps) => {
  const [count, setCount] = React.useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setCount((prevCount) => prevCount + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      {name} {count}
      <div>{document?.metadata?.title}</div>
      <ul>
        {products.map(
          (product: { name: string; price: number }, index: number) => (
            <li key={index}>
              {product.name} - ${product.price}
            </li>
          ),
        )}
      </ul>
    </div>
  );
};

export default Home;
