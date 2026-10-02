type ServerCallback = (args: any) => Promise<any>;

export const register = new Map<string, ServerCallback>();

const server = (callback: ServerCallback, id?: string) => {
  if (id) register.set(id, callback);
  return async (args?: any) => {
    if (__XANIX_SERVER__) {
      return await callback(args);
    } else {
      const res = await fetch(`/__xanix__/actions/${id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(args),
      });
      if (res.status !== 200) {
        throw new Error(`Request failed with status ${res.status}`);
      }
      const { data } = await res.json();
      return data;
    }
  };
};

export default server;
