import type { ComponentType, ReactElement } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";

export function mount<P extends object>(Component: ComponentType<P>, props: P) {
  const root = document.getElementById("root");
  if (!root) {
    throw new Error("Root element not found");
  }
  return createRoot(root).render(<Component {...props} />);
}

export function hydrate<P extends object>(
  Component: ComponentType<P>,
  props: P,
) {
  const root = document.getElementById("root");
  if (!root) {
    throw new Error("Root element not found");
  }
  return hydrateRoot(root, <Component {...props} />);
}
