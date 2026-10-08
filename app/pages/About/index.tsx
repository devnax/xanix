import { Button } from "@xanui/ui";
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
  );

  useMemo(() => {
    // navigate("/?name=new");
  }, []);
  if (d.loading) return "loading...";
  return (
    <div>
      About Page - Server Data: {JSON.stringify(d.data)}
      <Button onClick={() => navigate("/")}>Home</Button>
    </div>
  );
};

export default AboutPage;
