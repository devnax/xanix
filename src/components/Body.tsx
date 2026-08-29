import { useDocument } from "./Document/context.js";

type BodyProps = {
  children?: React.ReactNode;
};

const Body = ({ children }: BodyProps) => {
  const isClient = typeof window !== "undefined";
  if (isClient) {
    return <div id="root">{children}</div>;
  }
  return (
    <body>
      <div id="root">{children}</div>
    </body>
  );
};

export default Body;
