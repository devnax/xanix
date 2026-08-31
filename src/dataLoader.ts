type PageId = string;
type Callback = (args: Record<string, any>) => Promise<any>;
type XanixId = string;

type XanixDT = {
  args: Record<string, any>;
  callback: Callback;
};

let global: any = typeof window === "undefined" ? globalThis : window;
global.$XANIXDT_INITIALED = new Map<PageId, boolean>();
global.$XANIXDT = new Map<XanixId, XanixDT>();
global.$XANIXDT_PAGES = new Map<PageId, XanixId[]>();

const register = (xanixId: XanixId, callback: Callback) => {
  global.$XANIXDT.set(xanixId, { args: {}, callback });
  return xanixId;
};

const registerPage = (
  pageId: PageId,
  xanixId: XanixId,
  args: Record<string, any>,
) => {
  if (!global.$XANIXDT_PAGES.has(pageId)) {
    global.$XANIXDT_PAGES.set(pageId, []);
  }
  global.$XANIXDT_PAGES.get(pageId)!.push(xanixId);
  global.$XANIXDT.get(xanixId)!.args = args;
  return xanixId;
};

const results = async (pageId: PageId) => {
  global.$XANIXDT_INITIALED.set(pageId, true);
  const page = global.$XANIXDT_PAGES.get(pageId) || [];
  const datas: Record<string, any> = {};
  await Promise.all(
    page.map(async (xanixId: XanixId) => {
      const { callback, args } = global.$XANIXDT.get(xanixId)!;
      const data = await callback(args);
      datas[xanixId] = data;
    }),
  );
  return datas;
};

const result = async (xanixId: XanixId, args?: Record<string, any>) => {
  const item = global.$XANIXDT.get(xanixId);
  if (item) {
    const { callback, args: storedArgs } = item;
    const data = await callback(args ?? storedArgs);
    return data;
  }
};

const isInit = (pageId: PageId) => {
  return global.$XANIXDT_INITIALED.get(pageId) ?? false;
};

const dataLoader = {
  results,
  result,
  isInit,
  register,
  registerPage,
};
export default dataLoader;
