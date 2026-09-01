type BodyProps = {
  children?: React.ReactNode;
};

const Body = ({ children }: BodyProps) => {
  if (__XANIX_CLIENT__) {
    return children;
  } else {
    return <body>{children}</body>;
  }
};

export default Body;
