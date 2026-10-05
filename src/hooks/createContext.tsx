import { createContext as ctx } from "react";
import useDocument from "./useDocument.js";

const createContext = (defaultValue: unknown) => {
  const Context = ctx(defaultValue);
  const Provider = ({
    children,
    value,
  }: {
    children: React.ReactNode;
    value: unknown;
  }) => {
    const doc = useDocument();
    // console.log(value);

    return <Context.Provider value={value}>{children}</Context.Provider>;
  };
  return { ...Context, Provider };
};

export default createContext;
