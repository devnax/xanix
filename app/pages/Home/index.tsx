import React, { Suspense, useMemo, useState } from "react";
import { navigate, useSearchParams, useCookies, useServer } from "xanix";
import Chunk from "./Chunk";
import HomeFilledIcon from "@iconify-react/ant-design/home-filled";
import BaselineAddChartIcon from "@iconify-react/ic/baseline-add-chart";
import Wellcome from "./Wellcome";
import Button from "@xanui/ui/Button";
import Avatar from "@xanui/ui/Avatar";

const Show = () => {
  const params = useSearchParams();
  const query = params.get("query");
  const cookie = useCookies();
  const name = cookie.get("name");
  return (
    <div>
      Query: {query} Name: {name}
    </div>
  );
};

const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(() => resolve({ name: "Nax" }), ms));

// const Data = ({ name }: any) => {
//   const d = useServer(
//     async ({ name }) => {
//       console.log(name);

//       return {
//         name,
//       };
//     },
//     { name },
//   );
//   return <div>data: {d.data.name}</div>;
// };

const wellcome = new Wellcome();

const HomePage = ({ another, category }: any) => {
  const [n, setN] = useState("Nax");

  const d = useServer(
    async ({ name }) => {
      return {
        name,
      };
    },
    {
      name: n,
      cache: {
        ttl: 5000,
      },
    },
  );

  const params = useSearchParams();
  const cookie = useCookies();
  const name = cookie.get("name");

  useMemo(() => {
    cookie.set("name", "John Doe");
  }, []);

  if (d.loading) return <div>Loading...</div>;
  return (
    <div>
      <div>{wellcome.message()} ho</div>
      {/* <HomeFilledIcon /> */}
      <Avatar />
      <BaselineAddChartIcon />
      <Chunk />
      <div>Server Data: {d.data.name} </div>
      <button
        onClick={() => {
          setN(Math.random().toString());
        }}
      >
        change namex
      </button>
      <Show />
      Home Page {params.toString()} Name: {name}
      <input
        type="text"
        value={params.get("query") || ""}
        onChange={(e) => {
          params.set("query", e.target.value);
        }}
      />
      <button
        onClick={() => {
          navigate("/about");
        }}
      >
        About Page
      </button>
      <Button
        onClick={() => {
          cookie.set("name", "Well");
        }}
      >
        Set Cookie
      </Button>
    </div>
  );
};

export default HomePage;
