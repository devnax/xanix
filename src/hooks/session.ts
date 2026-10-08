// import crypto from "node:crypto";
import { createStore, useStore } from "./useStore.js";
import server, { ServerContext } from "./server.js";
import useServer from "./useServer";

export interface SessionOptions {
  secret: string;
  verify: (info: any) => Promise<boolean>;
  getUser: (info: any) => Promise<Record<string, any>>;
}

export const createSession = ({ secret, verify, getUser }: SessionOptions) => {
  const store = createStore();
  const readUser = server(getUser);

  const login = server(async (info, ctx?: ServerContext) => {
    if (__XANIX_SERVER__) {
      const isValid = await verify(info);
      if (!isValid) {
        throw new Error("Invalid login");
      }
      const sessionId = crypto.randomUUID();
      ctx!.response.cookie("session", sessionId, { httpOnly: true });
      return await readUser(info);
    }
    return { store };
  });

  const logout = server(async () => {
    return { store };
  });

  return {
    secret,
    store,
    login,
    logout,
    read: readUser,
  };
};

export const useSession = (session: ReturnType<typeof createSession>) => {
  const { data } = useServer(async () => await session.read());
  const store = useStore(session.store);

  return {
    data: {},
    login: async (info: any) => {
      return await session.login(data);
    },
    logout: async () => {
      return await session.logout();
    },
    read: async () => {
      return await session.read();
    },
  };
};
