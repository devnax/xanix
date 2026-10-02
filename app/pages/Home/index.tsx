import React, { Suspense, useMemo, useState } from "react";
import {
  navigate,
  useSearchParams,
  useCookies,
  useServer,
  useDocument,
  server,
} from "xanix";
import Chunk from "./Chunk";
import Button from "@xanui/ui/Button";
import IconButton from "@xanui/ui/IconButton";
import Avatar from "@xanui/ui/Avatar";
import Person from "@xanui/icons/Person";
import BaselineAddChartIcon from "@iconify-react/ic/baseline-add-chart";
import { createTheme, ThemeProvider } from "@xanui/core";
import fs from "fs";
import path from "path";

const getUser = server(async ({ id }) => {
  const root = process.cwd();
  const txt = await fs.promises.readFile(path.join(root, `text.txt`), "utf-8");
  return txt;
});
const getUser1 = server(async ({ id }) => {
  const root = process.cwd();
  const txt = await fs.promises.readFile(path.join(root, `text.txt`), "utf-8");

  return txt;
});

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
      <Avatar />
      <Button>Nice </Button>
      <IconButton />
      <div>Server Data: {d.data.name}</div>
      <button
        onClick={async () => {
          const user = await getUser({ id: "example-id" });
          console.log(user);
          await getUser1();
        }}
      >
        log user
      </button>
      <button
        onClick={() => {
          setN(Math.random().toString());
        }}
      >
        Randomize
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
        About Pages
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
