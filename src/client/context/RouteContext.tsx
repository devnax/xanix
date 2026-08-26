import React, { useMemo } from "react";

export const RouteContext = React.createContext<string>("");

type RouteProviderProps = {
  children: React.ReactNode;
  value?: string;
};

let dispach: any = null;

export const RouteProvider = ({ children, value }: RouteProviderProps) => {
  const [route, setRoute] = React.useState(value || window.location.pathname);
  useMemo(() => {
    if (value) {
      dispach = () => {
        setRoute(value);
      };
    }
  }, [value]);
  return (
    <RouteContext.Provider value={route}>{children}</RouteContext.Provider>
  );
};

export default RouteContext;
