import { createContext as ctx } from "react";
import useDocument from "./useDocument.js";

const createContext = (value: unknown) => {
  const Context = ctx(value);
  const Provider = ({ children }: { children: React.ReactNode }) => {
    const doc = useDocument();
    return <Context.Provider value={value}>{children}</Context.Provider>;
  };
  return { ...Context, Provider };
};

export default createContext;
