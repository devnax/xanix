import React, { useEffect } from "react";
import { XanixPageProps } from "xanix";
import Button from "@xanui/ui/Button";
import { createTheme, ThemeProvider } from "@xanui/core";

import img from "./image.png";

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
    <ThemeProvider theme={createTheme({ mode: "light", name: "default" })}>
      {name} {count}
      <div>{document?.metadata?.title}</div>
      <Button onClick={() => alert("Button clicked!")}>Click</Button>
      <button>well s</button>
      <img width={40} src={img} alt="Example" />
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
