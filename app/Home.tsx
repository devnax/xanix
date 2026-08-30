import React, { useEffect } from "react";
import Button from "@xanui/ui/Button";
import { createTheme, ThemeProvider } from "@xanui/core";
// import img from "./image.png";
import { navigate } from "../src/client";

export type HomeProps = {
  name: string;
  products: Array<{
    name: string;
    price: number;
  }>;
};

const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(() => resolve({ name: "nax" }), ms));

const Home = ({ name, products }: HomeProps) => {
  const [count, setCount] = React.useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setCount((prevCount) => prevCount + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <ThemeProvider theme={createTheme({ mode: "light", name: "default" })}>
      {name} {count}
      <Button onClick={() => alert("Button clicked!")}>Click</Button>
      <button onClick={() => navigate("/abouts")}>About</button>
      <button onClick={() => navigate("/product")}>Product</button>
      {/* <img width={40} src={img} alt="Example" /> */}
      <ul>
        {products.map(
          (product: { name: string; price: number }, index: number) => (
            <li key={index}>
              {product.name} - ${product.price}
            </li>
          ),
        )}
      </ul>
    </ThemeProvider>
  );
};

export default Home;
