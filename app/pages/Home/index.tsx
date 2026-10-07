import React, { Suspense, useMemo, useState } from "react";
import {
  navigate,
  useSearchParams,
  useCookies,
  useServer,
  useDocument,
  server as srv,
  cache,
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

const getUser = srv(
  async ({ file, id }) => {
    if (file) {
      const updir = path.join(process.cwd(), ".xanix/uploads");
      await fs.promises.mkdir(updir, { recursive: true });
      const filePath = path.join(updir, file.name);
      await fs.promises.writeFile(
        filePath,
        Buffer.from(await file.arrayBuffer()),
      );
    }

    return "txt";
  },
  {
    ttl: 2000, // cache time-to-live in milliseconds
    // mode: "server",
  },
);

const HomePage = ({ another, category }: any) => {
  const [n, setN] = useState("Nax");

  const d = useServer(
    async ({ name }: any, ctx) => {
      return {
        name,
      };
    },
    {
      name: n,
    },
    {
      ttl: 2000, // cache time-to-live in milliseconds
    },
  );

  // console.log(d);

  const params = useSearchParams();
  const cookie = useCookies();
  const name = cookie.get("name");
  const [file, setFile] = useState<File | null>(null);

  useMemo(() => {
    cookie.set("name", "John Doe");
  }, []);

  return (
    <div>
      <Chunk />
      <Avatar />
      <Button>Nice one</Button>
      <IconButton />
      <div>Server Data:</div>
      <input
        type="file"
        id="fileInput"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />
      <button
        onClick={async () => {
          // if (!file) return;
          const user = await getUser({ file, id: "example" });
          console.log(user);
        }}
      >
        log user haha
      </button>
      <button
        onClick={() => {
          setN(Math.random().toString());
        }}
      >
        Randomize
      </button>
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
