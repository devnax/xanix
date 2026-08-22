import React, { Suspense } from "react";
const Chunk = React.lazy(() => import("./Chunk"));
const About = () => {
  return (
    <div>
      About Page
      <Suspense fallback={<div>Loading...</div>}>
        <Chunk />
      </Suspense>
    </div>
  );
};

export default About;
