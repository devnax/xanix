type Uid = string;
export const state = new Map<Uid, Function>();

const set = (uid: Uid, fn: Function) => {
  state.set(uid, fn);
};

const get = (uid: Uid) => {
  return state.get(uid);
};

const registry = {
  set,
  get,
};
export default registry;
