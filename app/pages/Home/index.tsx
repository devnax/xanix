import React, { Suspense, useMemo, useState } from "react";
import { navigate, useSearchParams, useCookies, useServer } from "xanix";
import Chunk from "./Chunk";

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
        ttl: 5000, // example TTL value in milliseconds
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
      <Chunk />
      <div>Server Data: {d.data.name}</div>
      <button
        onClick={() => {
          setN(Math.random().toString());
        }}
      >
        change name
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
      <button
        onClick={() => {
          cookie.set("name", "Well");
        }}
      >
        Set Cookie
      </button>
    </div>
  );
};

export default HomePage;
