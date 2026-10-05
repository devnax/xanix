import { forwardRef, HTMLProps } from "react";
import { navigate } from "../navigate.js";
import { preload as _preload } from "../navigate.js";

export type LinkProps = Omit<
  HTMLProps<HTMLAnchorElement>,
  "href" | "preload"
> & {
  preload?: boolean;
  href: string;
};

const Link = (
  { children, preload, href, ...props }: LinkProps,
  ref: React.Ref<HTMLAnchorElement>,
) => {
  if (__XANIX_CLIENT__) {
    return (
      <a
        ref={ref}
        {...props}
        href={href}
        onClick={(e) => {
          if (props.target !== "_blank") {
            e.preventDefault();
            e.stopPropagation();
            navigate(href);
          }
        }}
        onMouseEnter={(e) => {
          if (preload && props.target !== "_blank") {
            _preload(href);
          }
        }}
      >
        {children}
      </a>
    );
  }
  return (
    <a href={href} {...props}>
      {children}
    </a>
  );
};

export default forwardRef(Link);
