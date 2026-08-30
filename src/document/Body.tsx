type BodyProps = {
  children?: React.ReactNode;
};

const Body = ({ children }: BodyProps) => {
  if (__XANIX_CLIENT__) {
    return children;
  }
  return <body>{children}</body>;
};

export default Body;
