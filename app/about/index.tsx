import React, { Suspense } from "react";
import { navigate } from "xanix/navigate";
const Chunk = React.lazy(() => import("../Chunk"));
const About = () => {
  return (
    <div>
      About Page
      <Suspense fallback={<div>Loading...</div>}>
        <Chunk />
      </Suspense>
      <button onClick={() => navigate("/")}>Home</button>
      <button onClick={() => navigate("/product")}>Product</button>
    </div>
  );
};

export default About;
