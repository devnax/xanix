import React, { useEffect } from "react";
import Button from "@xanui/ui/Button";
import { createTheme, ThemeProvider } from "@xanui/core";
// import img from "./image.png";
import { navigate, useLocation } from "../src/navigation/index.js";
import { useSearchParams, usePathname } from "../src/router/index.js";

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
  const location = useLocation();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  useEffect(() => {
    console.log("pathname", pathname);

    const interval = setInterval(() => {
      setCount((prevCount) => prevCount + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <ThemeProvider theme={createTheme({ mode: "light", name: "default" })}>
      {name} {count}
      <button onClick={() => searchParams.set("key", "value")}>set</button>
      <button onClick={() => searchParams.delete("key")}>delete</button>
      <button onClick={() => console.log(searchParams.getAll())}>show</button>
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
