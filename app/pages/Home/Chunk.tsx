import r, { createContext as ctx } from "react";
import Button from "@xanui/ui/Button";

const ChunkContext = r.createContext(null);

const Chunk = () => {
  return (
    <ChunkContext.Provider value={null}>
      Chunks
      <Button>Click Ms</Button>
    </ChunkContext.Provider>
  );
};
export default Chunk;
