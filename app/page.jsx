import { navigate } from "../src/libs/navigate";
import Button from "./Button";
export const metadata = {
  title: "Server Rendered Page",
  description: "This page is rendered on the server",
};

export const props = async (req, res) => {
  return {
    message: "Hello from the server",
  };
};

const page = ({ page, message }) => {
  return (
    <div>
      <Button />
      server are rendered: {page} - {message}
      <button onClick={() => navigate("/html")}>Click me</button>
      <button onClick={() => navigate("/about")}>About</button>
    </div>
  );
};

export default page;
