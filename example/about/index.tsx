import React, { Suspense } from "react";
import { navigate } from "../../src/index.js";
const Chunk = React.lazy(() => import("../Chunk"));
const About = () => {
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
