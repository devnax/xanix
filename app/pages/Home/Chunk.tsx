import r, { createContext as ctx } from "react";
import Button from "@xanui/ui/Button";
import { useRequest, useServer } from "xanix";

const ThemeContext = r.createContext<string | null>(null);

const Chunk = () => {
  const req = useRequest();

  return (
    <div>
      <ThemeContext.Provider value={"light"}>Chunks</ThemeContext.Provider>
    </div>
  );
};
export default Chunk;
