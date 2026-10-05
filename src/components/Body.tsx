import { HTMLProps } from "react";
type BodyProps = HTMLProps<HTMLBodyElement>;

const Body = ({ children, ...props }: BodyProps) => {
  if (__XANIX_CLIENT__) {
    return children;
  } else {
    return <body {...props}>{children}</body>;
  }
};

export default Body;
