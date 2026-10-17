import { navigate } from "../src/libs/navigate.js";
const Page = ({ page, message }) => {
  return (
    <div>
      server are rendered: {page} - {message}
      <button onClick={() => navigate("/html")}>Click me </button>
    </div>
  );
};

export default Page;
