import { useMemo } from "react";
import { navigate, useServer } from "xanix";

const AboutPage = () => {
  const d = useServer(
    async () => {
      return {
        pageName: "about",
      };
    },
    {
      name: 1,
    },
    {
      ttl: 2000, // cache time-to-live in milliseconds
    },
  );

  useMemo(() => {
    // navigate("/?name=new");
  }, []);
  if (d.loading) return "loading...";
  return (
    <div>
      About Page - Server Data: {JSON.stringify(d.data)}
      <button onClick={() => navigate("/")}>Home</button>
    </div>
  );
};

export default AboutPage;
