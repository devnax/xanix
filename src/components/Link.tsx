import { HTMLProps, useEffect, useRef } from "react";
import { navigate } from "../navigate.js";

export type LinkProps = Omit<
  HTMLProps<HTMLAnchorElement>,
  "href" | "preload"
> & {
  preload?: boolean;
  href: string;
};

const Link = ({ children, preload, ...props }: LinkProps) => {
  const ref = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    const load = () => {
      window.dispatchEvent(
        new CustomEvent("xanix:preload", { detail: { path: props.href } }),
      );
    };
    if (preload && ref.current) {
      ref.current.addEventListener("mouseenter", load);
    }

    return () => {
      if (preload && ref.current) {
        ref.current.removeEventListener("mouseenter", load);
      }
    };
  }, []);

  if (preload) {
    props.onMouseEnter;
  }
  return (
    <a
      ref={ref}
      {...props}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        navigate(props.href);
      }}
    >
      {children}
    </a>
  );
};

export default Link;
