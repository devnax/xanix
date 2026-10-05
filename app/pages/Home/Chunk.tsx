import r, { createContext as ctx } from "react";
import Button from "@xanui/ui/Button";
import { useRequest, useServer } from "xanix";

const ThemeContext = r.createContext<string | null>(null);

const Chunk = () => {
  const req = useRequest();
  const { data } = useServer(
    async ({ name }: any, ctx) => {
      return {
        name: ctx?.request.originalUrl,
      };
    },
    {
      name: "Chunk",
    },
  );
  return (
    <div>
      <ThemeContext.Provider value={data.name || ""}>
        Chunks
        <Button>Click Me</Button>
      </ThemeContext.Provider>
      <ThemeContext.Provider value={"light"}>
        Chunks
        <Button>Click Me</Button>
      </ThemeContext.Provider>
    </div>
  );
};
export default Chunk;
