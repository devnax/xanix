import React from "react";
import { navigate } from "xanix";

const HomePage = () => {
  return (
    <div>
      Home Page
      <button onClick={() => navigate("/about")}>Click Me</button>
    </div>
  );
};

export default HomePage;
