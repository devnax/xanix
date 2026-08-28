// user can write
import {server} from "xanix";
const Home = async (props) => {
  const data = await server(async (req, res) => {
    const path = await import("path");
    const fs = await import("fs");
    const filePath = path.resolve(props.filename);
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
export default async function handler({filename}) {
  const path = await import("path");
  const fs = await import("fs");
  const filePath = path.resolve(filename);
  const fileContent = await fs.promises.readFile(filePath, "utf-8");
  return fileContent;
}

// server transform to
import {server, asynchronize} from "xanix";
const Home = async (props) => {
  const data = await server("request_random_id", {
    filename: props.filename
  });

 return () => {
    useState(data);
    useEffect(() => {
      console.log(data);
    }, [data]);

  return <div>Home Page Preview: {data}</div>;
  }
};

export default asynchronize(Home);

