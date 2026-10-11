import { HTMLProps } from "react";
import outdirs from "../outdirs.js";
type BodyProps = HTMLProps<HTMLBodyElement>;

const Body = ({ children, ...props }: BodyProps) => {
  if (__XANIX_CLIENT__) {
    return children;
  } else {
    return (
      <body {...props}>
        {children}{" "}
        <script type="module" src={`/${outdirs.client}/runtime.js`}></script>
      </body>
    );
  }
};

export default Body;
