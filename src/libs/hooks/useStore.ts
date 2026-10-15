import { useSyncExternalStore } from "react";

type StoreState = Record<string, any>;

export type Store<S extends StoreState = StoreState> = {
  subscribe: (callback: () => void) => () => void;
  emit: () => void;
  state: () => S;
  observe: () => number;
  set: <K extends keyof S, V extends S[K]>(
    key: K,
    value: V,
    emit?: boolean,
  ) => void;
  get: <K extends keyof S>(key?: K) => S[K] | S;
  delete: <K extends keyof S>(key: K, shouldEmit?: boolean) => void;
};

export const createStore = <S extends StoreState>(
  initialState?: S,
): Store<S> => {
  const handlers = new Set<() => void>();
  const state: { data: S; observe: number } = {
    data: initialState ?? ({} as S),
    observe: 0,
  };

  const subscribe = (callback: () => void) => {
    handlers.add(callback);
    return () => {
      handlers.delete(callback);
    };
  };

  const emit = () => {
    state.observe++;
    for (const handler of handlers) {
      handler();
    }
  };

  const set = <K extends keyof S, V extends S[K]>(
    key: K,
    value: V,
    shouldEmit = true,
  ) => {
    state.data = { ...state.data, [key]: value };
    if (shouldEmit) emit();
  };

  const get = <K extends keyof S>(key?: K): S[K] | S =>
    key !== undefined ? state.data[key] : state.data;

  const deleteKey = <K extends keyof S>(key: K, shouldEmit = true) => {
    const { [key]: _, ...rest } = state.data;
    state.data = rest as S;
    if (shouldEmit) emit();
  };

  return {
    subscribe,
    state: () => state.data,
    observe: () => state.observe,
    set,
    get,
    emit,
    delete: deleteKey,
  };
};

export const useStore = <T = any>(store: Store): Store => {
  useSyncExternalStore(store.subscribe, store.observe, store.observe);
  return store;
};
