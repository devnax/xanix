import { useMemo } from "react";
import { navigate } from "xanix";

const AboutPage = () => {
  useMemo(() => {
    // navigate("/?name=new");
  }, []);
  return (
    <div>
      About Page
      <button onClick={() => navigate("/")}>Home</button>
    </div>
  );
};

export default AboutPage;
