export type UseServerCallback<T = any> = (
  args: Record<string, any>,
) => Promise<T>;
type PageId = string;
type Uid = string;
type ResourceStatus = "pending" | "success" | "error";
type ServerResource<T = any> = {
  expiredAt: number; // time to live in milliseconds for the cache
  args: Record<string, any>;
  uid: Uid;
  status: ResourceStatus;
  promise: Promise<T>;
  value?: T;
  error?: unknown;
  read: () => T;
};

export const ServerRegistry = new Map<string, UseServerCallback>();
export const ServerResources = new Map<PageId, Map<string, ServerResource>>();

const createResourceKey = (uid: Uid, args: Record<string, any>): string => {
  return `${uid}:${JSON.stringify(args ?? {})}`;
};

function createResource<T>(
  uid: Uid,
  args: Record<string, any>,
  promise: Promise<T>,
): ServerResource<T> {
  const ttl = __XANIX_DEV__
    ? 0
    : args?.cache === true
      ? 3600 * 1000
      : (args?.cache?.ttl ?? 0);

  const resource: ServerResource<T> = {
    uid,
    args,
    status: "pending",
    expiredAt: Date.now() + ttl,
    promise,
    read() {
      if (resource.status === "pending") {
        throw resource.promise;
      }
      if (resource.status === "error") {
        throw resource.error;
      }
      return resource.value as T;
    },
  };

  promise.then(
    (value) => {
      resource.status = "success";
      resource.value = value;
    },
    (error) => {
      resource.status = "error";
      resource.error = error;
    },
  );

  return resource;
}

export function getServerResource<T>(
  pageId: PageId,
  uid: Uid,
  args: Record<string, any>,
): ServerResource<T> {
  let resources = ServerResources.get(pageId);

  if (!resources) {
    resources = new Map();
    ServerResources.set(pageId, resources);
  }

  const key = createResourceKey(uid, args);
  const existing = resources.get(key);
  if (existing) {
    return existing as ServerResource<T>;
  }

  const callback = ServerRegistry.get(uid);
  if (typeof callback !== "function") {
    throw new Error(
      `useServer(): No server callback registered for uid "${uid}".`,
    );
  }

  const promise = Promise.resolve(callback(args));
  const resource = createResource<T>(uid, args, promise);
  resources.set(key, resource);
  return resource;
}

export const getPageResources = (
  pageId: PageId,
): Map<string, ServerResource> | undefined => {
  return ServerResources.get(pageId);
};

export const clearExpiredUseServerResources = (): void => {
  const now = Date.now();

  for (const [pageId, resources] of ServerResources) {
    for (const [key, resource] of resources) {
      if (resource.expiredAt <= now) {
        resources.delete(key);
      }
    }

    if (resources.size === 0) {
      ServerResources.delete(pageId);
    }
  }
};
