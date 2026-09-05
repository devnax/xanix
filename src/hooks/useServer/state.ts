type PageId = string;
type Uid = string;
type Data = any;
const state = new Map<PageId, Record<Uid, Data>>();
const getHandlers = (pageId: string) => {
  return state.get(pageId) || {};
};

const setData = (pageId: string, uid: string, data: any) => {
  const handlers = getHandlers(pageId);
  handlers[uid] = data;
  state.set(pageId, handlers);
};

const getAllData = (pageId: string) => {
  return getHandlers(pageId);
};

const clearAll = (pageId: string) => {
  state.delete(pageId);
};

const getData = (pageId: string, uid: string) => {
  const handlers = getHandlers(pageId);
  return handlers[uid];
};

const clearData = (pageId: string, uid: string) => {
  const handlers = getHandlers(pageId);
  delete handlers[uid];
  state.set(pageId, handlers);
};

const UseServerRegistry = {
  getHandlers,
  setData,
  getData,
  clearData,
  clearAll,
  getAllData,
};

export default UseServerRegistry;
