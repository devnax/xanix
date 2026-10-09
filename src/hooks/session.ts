import { createStore, useStore } from "./useStore.js";
import server, { ServerContext } from "./server.js";
import useServer from "./useServer";
import { cookieParser } from "./useCookies.js";
import { useMemo } from "react";

export interface SessionOptions {
  secret: string;
  verify: (info: any) => Promise<boolean>;
  getUser: (info: any) => Promise<Record<string, any>>;
}

export type SessionCode = "SUCCESS" | "INVALID_INFO" | "SESSION_NOT_FOUND";
const sessions = new Map<string, SessionOptions>();

const login = server(async ({ id, info }, ctx?: ServerContext) => {
  const session = sessions.get(id);
  if (!session) {
    throw new Error("Session not found");
  }

  try {
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
    ctx!.response.cookie(id, data, {
      httpOnly: true,
      secure: true,
    });
    return user;
  } catch (error) {
    return { code: "INVALID_INFO", message: (error as Error).message };
  }
});

const logout = server(async ({ id }, ctx?: ServerContext) => {
  const session = sessions.get(id);
  if (!session) {
    return {
      code: "SESSION_NOT_FOUND",
      error: true,
      message: "Session not found",
    };
  }

  ctx!.response.clearCookie(id);
  return { code: "SUCCESS", error: false, message: "Session logged out" };
});

const getUser = server(async ({ id, token }, ctx?: ServerContext) => {
  const session = sessions.get(id);
  if (!session) {
    return {
      code: "SESSION_NOT_FOUND",
      error: true,
      message: "Session not found",
    };
  }

  if (ctx) {
    const cookie = ctx.request.cookies[id];
    if (!cookie) {
      return {
        code: "SESSION_NOT_FOUND",
        error: true,
        message: "Session not found",
      };
    }
    token = cookie;
  }

  if (!token) {
    return {
      code: "SESSION_NOT_FOUND",
      error: true,
      message: "Session not found",
    };
  }
  const encryptModule = await import("./encript.js");
  const data = encryptModule.decrypt(token, session.secret);
  const parsed = JSON.parse(data);

  if (!parsed.info || new Date(parsed.expires) < new Date()) {
    ctx!.response.clearCookie(id);
    return {
      code: "SESSION_NOT_FOUND",
      error: true,
      message: "Session not found",
    };
  }
  return await session.getUser(parsed.info);
});

export const createSession = (option: SessionOptions, id?: string) => {
  if (!id) {
    throw new Error("Session ID is required");
  }
  if (__XANIX_SERVER__) {
    sessions.set(id!, option);
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
      const res = await logout({ id });
      store.set("user", null);
      return res;
    },
    getUser: async () => await getUser({ id }),
  };
};

export const useSession = (session: ReturnType<typeof createSession>) => {
  const { data } = useServer(
    async ({ id }, ctx?: ServerContext) => {
      const cookie = ctx!.request.headers["cookie"];
      const parsed = cookieParser(cookie ?? "");

      if (!parsed || !parsed[id]) {
        return;
      }
      return await getUser({ id, token: parsed[id] });
    },
    { id: session.id },
  );

  if (__XANIX_SERVER__) {
    return data;
  }

  const store = useStore(session.store);
  useMemo(() => {
    if (data) {
      store.set("user", data, false);
    }
  }, [JSON.stringify(data)]);

  return store.get("user");
};
