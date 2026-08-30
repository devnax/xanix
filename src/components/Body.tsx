type BodyProps = {
  children?: React.ReactNode;
};

const Body = ({ children }: BodyProps) => {
  const isClient = typeof window !== "undefined";
  if (isClient) {
    return children;
  }
  return <body>{children}</body>;
};

export default Body;
