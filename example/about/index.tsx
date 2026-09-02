import React, { Suspense } from "react";
import { navigate, useDocument } from "xanix";
const Chunk = React.lazy(() => import("../Chunk"));

const About = () => {
  const doc = useDocument();
  return (
    <div>
      About Pag
      <Suspense fallback={<div>Loading...</div>}>
        <Chunk />
      </Suspense>
      <button onClick={() => navigate("/")}>Home</button>
      <button onClick={() => navigate("/product")}>Product</button>
    </div>
  );
};

export default About;
