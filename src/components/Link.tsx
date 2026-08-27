import { HTMLProps } from "react";
import { navigate } from "../client/navigation";

export type LinkProps = Omit<HTMLProps<HTMLAnchorElement>, "href"> & {
  href: string;
};

const Link = ({ children, ...props }: LinkProps) => {
  return (
    <a
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
