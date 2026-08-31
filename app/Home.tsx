import React, { useEffect } from "react";
import Button from "@xanui/ui/Button";
import { createTheme, ThemeProvider } from "@xanui/core";
import img from "./image.png";
import { navigate, useLocation, usePage, useData } from "../src/index.js";
import { useSearchParams, usePathname, useCookies } from "../src/index.js";

export type HomeProps = {
  name: string;
  products: Array<{
    name: string;
    price: number;
  }>;
};

const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(() => resolve({ name: "nax" }), ms));

const Data = () => {
  const d = useData(
    async (args: any) => {
      return args;
    },
    { id: 1, name: "nax" },
  );

  return (
    <div>
      {d.data?.name}
      <button onClick={() => d.reload()}>reload</button>
    </div>
  );
};

const Home = ({ name, products }: HomeProps) => {
  const [count, setCount] = React.useState(0);
  // const location = useLocation();
  // const searchParams = useSearchParams();
  // const pathname = usePathname();
  // const cookies = useCookies();
  // const page = usePage();
  const [open, setOpen] = React.useState(false);

  useEffect(() => {
    setCount(count + 1);
  }, []);

  return (
    <div>
      {name} {count}
      {open && <Data />}
      <button onClick={() => setOpen(!open)}>Toggle Data</button>
      <button onClick={() => d.reload()}>reload</button>
      {/* <button onClick={() => searchParams.set("key", "value")}>set</button>
      <button onClick={() => searchParams.delete("key")}>delete</button>
      <button onClick={() => console.log(searchParams.getAll())}>show</button> */}
      <Button onClick={() => alert("Button clicked!")}>Click</Button>
      <button onClick={() => navigate("/abouts")}>About</button>
      <button onClick={() => navigate("/product")}>Product</button>
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
    </div>
  );
};

export default Home;
