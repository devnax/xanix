import { type HTMLProps } from "react";
export type DocumentProps = HTMLProps<HTMLHtmlElement> & {
  children?: React.ReactNode;
};

const Document = ({ children, ...props }: DocumentProps) => {
  if (__XANIX_CLIENT__) {
    return children;
  } else {
    return <html {...props}>{children}</html>;
  }
};

export default Document;
