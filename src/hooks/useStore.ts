import { useRef, useSyncExternalStore } from "react";

type StoreState = Record<string, any>;

export type Store<S extends StoreState = StoreState> = {
  subscribe: (callback: () => void) => () => void;
  emit: () => void;
  state: () => S;
  observe: () => number;
  set: <K extends keyof S, V extends S[K]>(key: K, value: V) => void;
  get: <K extends keyof S>(key?: K) => S[K] | S;
};

export const createStore = <S extends StoreState>(
  initialState?: S,
): Store<S> => {
  const handlers = new Set<() => void>();
  const state: { data: S; observe: number } = {
    data: initialState ?? ({} as S),
    observe: Date.now(),
  };

  const subscribe = (callback: () => void) => {
    handlers.add(callback);
    return () => {
      handlers.delete(callback);
    };
  };

  const emit = () => {
    state.observe = Date.now();
    for (const handler of handlers) {
      handler();
    }
  };

  const set = <K extends keyof S, V extends S[K]>(key: K, value: V) => {
    state.data = { ...state.data, [key]: value };
    emit();
  };

  const get = <K extends keyof S>(key?: K) =>
    key ? state.data[key] : state.data;

  return {
    subscribe,
    state: () => state.data,
    observe: () => state.observe,
    set,
    get,
    emit,
  };
};

export const useStore = <T = any>(store: Store): Store => {
  const getSnapshot = () => store?.observe?.();
  useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot);
  return store;
};
