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
      server are rendered: {page} - {message}
      <button onClick={() => alert("Button clicked!")}>Click me</button>
    </div>
  );
};

export default page;
