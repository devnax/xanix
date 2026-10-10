import { Button } from "@xanui/ui";
import { useMemo } from "react";
import { navigate, server, useServer } from "xanix";
import { useAuth, session } from "../Home/auth";

const well = server(async () => {
  return {
    pageName: "about",
  };
});

const AboutPage = () => {
  const d = useServer(well, {
    name: 1,
  });

  // const auth = useAuth();
  // if (!auth) {
  //   navigate("/");
  //   return null;
  // }

  return (
    <div>
      {/* {!!auth && JSON.stringify(auth)} */}
      <Button
        onClick={async () => {
          // const user = await session.login({ id: "example" });
        }}
      >
        Login
      </Button>
      About Page - Server Data: {JSON.stringify(d.data)}
      <Button onClick={() => navigate("/")}>Home</Button>
    </div>
  );
};

export default AboutPage;
