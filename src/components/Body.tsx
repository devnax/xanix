import { useDocument } from "./Document/context.js";

type BodyProps = {
  children?: React.ReactNode;
};

const Body = ({ children }: BodyProps) => {
  return <body>{children}</body>;
};

export default Body;
