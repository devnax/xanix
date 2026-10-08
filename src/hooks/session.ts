import crypto from "crypto";
import { createStore, useStore } from "./useStore.js";
import server from "./server.js";
import useServer from "./useServer";

export const createSession = (secret: string) => {
  const store = createStore();

  const login = server(async (data) => {
    return { store };
  });

  const logout = server(async () => {
    return { store };
  });

  const read = server(async () => {
    return { store };
  });

  return {
    secret,
    store,
    login,
    logout,
    read,
  };
};

export const useSession = (session: ReturnType<typeof createSession>) => {
  const { data } = useServer(session.read);
  const store = useStore(session.store);

  return {
    data: {
      name: "John Doe",
    },
    login: (data: any) => {
      return session.login(data);
    },
    logout: () => {
      return session.logout();
    },
    read: () => {
      return session.read();
    },
  };
};
