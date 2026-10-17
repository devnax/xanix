import { navigate } from "../../src/libs/navigate";
export const metadata = {
  title: "About",
  description: "This page is rendered on the server",
};

const page = ({ page, message }: any) => {
  return (
    <div>
      server are rendered: {page} - {message}
      <button onClick={() => navigate("/")}>Home</button>
    </div>
  );
};

export default page;
