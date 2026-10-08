// import crypto from "node:crypto";
import { createStore, useStore } from "./useStore.js";
import server, { ServerContext } from "./server.js";
import useServer from "./useServer";
import { cookieParser } from "./useCookies.js";
import { useEffect, useRef } from "react";

export interface SessionOptions {
  secret: string;
  verify: (info: any) => Promise<boolean>;
  getUser: (info: any) => Promise<Record<string, any>>;
}

const sessions = new Map<string, SessionOptions>();

const login = server(async ({ id, info }, ctx?: ServerContext) => {
  const session = sessions.get(id);
  if (!session) {
    throw new Error("Session not found");
  }

  await session.verify(info);
  const user = await session.getUser(info);
  const encryptModule = await import("./encript.js");
  const cookieData = {
    info,
    expires: new Date(Date.now() + 1000 * 60 * 60 * 24), // 1 day expiration
  };
  const data = encryptModule.encrypt(
    JSON.stringify(cookieData),
    session.secret,
  );
  ctx!.response.cookie("session", data, {
    httpOnly: true,
    secure: true,
  });
  return user;
});

const logout = server(async ({ id }, ctx?: ServerContext) => {
  const session = sessions.get(id);
  if (!session) {
    throw new Error("Session not found");
  }
  ctx!.response.clearCookie("session");
});

const getUser = server(async ({ id, token }, ctx?: ServerContext) => {
  const session = sessions.get(id);
  if (!session) {
    throw new Error("Session not found");
  }

  if (ctx) {
    const cookie = ctx.request.cookies["session"];
    if (!cookie) {
      return null;
    }
    token = cookie;
  }

  if (!token) {
    return null;
  }
  const encryptModule = await import("./encript.js");
  const data = encryptModule.decrypt(token, session.secret);
  const parsed = JSON.parse(data);

  if (!parsed.info || new Date(parsed.expires) < new Date()) {
    return null;
  }

  return await session.getUser(parsed.info);
});

export const createSession = (option: SessionOptions, id: string) => {
  if (__XANIX_SERVER__) {
    sessions.set(id, option);
  }
  const store = createStore({
    user: null,
  });
  return {
    id,
    store,
    login: async (info: any) => {
      const user = await login({ id, info });
      store.set("user", user);
      return user;
    },
    logout: async () => {
      await logout({ id });
      store.set("user", null);
    },
    getUser: async () => await getUser({ id }),
  };
};

export const useSession = (session: ReturnType<typeof createSession>) => {
  const { data } = useServer(
    async ({ id }, ctx?: ServerContext) => {
      const cookie = ctx!.request.headers["cookie"];
      if (!cookie) {
        return null;
      }
      const parsed = cookieParser(cookie);
      return await getUser({ id, token: parsed.session });
    },
    { id: session.id },
  );
  // const store = useStore(session.store);
  // const init = useRef(false);

  // useEffect(() => {
  //   if (!init.current) {
  //     init.current = true;
  //   }
  // }, []);

  // console.log(data);

  return data;

  // return !init.current ? data : store.get("user");
};
