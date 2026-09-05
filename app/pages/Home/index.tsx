import React, { Suspense, useMemo } from "react";
import { navigate, useSearchParams, useCookies, useServer } from "xanix";

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

const HomePage = ({ another, category }: any) => {
  const d = useServer(
    async () => {
      return {
        name: "Nax",
      };
    },
    { category },
  );
  console.log(d);

  const params = useSearchParams();
  const cookie = useCookies();
  const name = cookie.get("name");

  useMemo(() => {
    cookie.set("name", "John Doe");
  }, []);
  return (
    <div>
      another: {another}
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
