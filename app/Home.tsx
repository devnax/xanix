import React, { useEffect } from "react";

export const metadata = {
  title: "Home Page",
  description: "This is the home page of our application.",
};

const Home = ({ name, products }: any) => {
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

export default Home;
