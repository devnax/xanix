import type { ComponentType } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";

const pages = new Map<string, { component: ComponentType<any>; props: any }>();
const register = (path: string, component: ComponentType<any>, props: any) => {
  pages.set(path, { component, props });
};

const getPage = (path: string) => {
  return pages.get(path);
};

function mount<P extends object>(Component: ComponentType<P>, props: P) {
  const root = document.getElementById("root");
  if (!root) {
    throw new Error("Root element not found");
  }
  return createRoot(root).render(<Component {...props} />);
}

function hydrate<P extends object>(Component: ComponentType<P>, props: P) {
  const root = document.getElementById("root");
  if (!root) {
    throw new Error("Root element not found");
  }
  const path = window.location.pathname;
  register(path, Component, props);
  return hydrateRoot(root, <Component {...props} />);
}

(window as any).xanix = {
  register,
  getPage,
  mount,
  hydrate,
};
