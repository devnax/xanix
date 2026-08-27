// user can write
import {server} from "xanix";
const Home = async (props) => {
  const data = await server(async (req, res) => {
    const path = await import("path");
    const fs = await import("fs");
    const filePath = path.resolve("./somefile.txt");
    const fileContent = await fs.promises.readFile(filePath, "utf-8");
    return fileContent;
  },[props]);

  useState(data);
  useEffect(() => {
    console.log(data);
  }, [data]);

  return <div>Home Page Preview: {data}</div>;
};

// then in https/request_random_id.js
export default async function handler(req, res) {
  const path = await import("path");
  const fs = await import("fs");
  const filePath = path.resolve("./somefile.txt");
  const fileContent = await fs.promises.readFile(filePath, "utf-8");
  res.status(200).json(fileContent);
}

// server transform to
import {server, asynchronize} from "xanix";
const Home = async () => {
  const data = await server("request_random_id");

 return (data) => {
    useState(data);
    useEffect(() => {
      console.log(data);
    }, [data]);

  return <div>Home Page Preview: {data}</div>;
  }
};

export default asynchronize(Home);

