import { useEffect, useRef, useSyncExternalStore } from "react";

export type Store = {
  subscribe: (callback: () => void) => () => void;
  emit: () => void;
};

export const createStore = (): Store => {
  const handlers = new Set<() => void>();

  const subscribe = (callback: () => void) => {
    handlers.add(callback);
    return () => {
      handlers.delete(callback);
    };
  };

  const emit = () => {
    for (const handler of handlers) {
      handler();
    }
  };

  return {
    subscribe,
    emit,
  };
};

export const createStoreRef = () => {
  const storeRef = useRef<Store | null>(null);
  storeRef.current = storeRef.current ?? createStore();
  return storeRef.current;
};

type Return<T = any> = [T, Store];
type State<T = any> = T | (() => T);

export const useStore = <T = any>(
  state: State<T>,
  store?: Store,
): Return<T> => {
  store = store ?? createStoreRef();
  const getSnapshot =
    typeof state === "function" ? (state as () => T) : () => state;
  const data = useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot);
  return [data as T, store];
};
