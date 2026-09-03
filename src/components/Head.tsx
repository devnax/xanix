import { useEffect } from "react";
import useDocument from "../hooks/useDocument.js";
import outdirs from "../outdirs.js";

type HeadProps = {
  children?: React.ReactNode;
};

const Head = ({ children }: HeadProps) => {
  const { pageId, props, params, metadata, usedata } = useDocument();
  if (__XANIX_CLIENT__) {
    useEffect(() => {
      const head = document.head;
      if (children) {
        const container = document.createElement("div");
        container.innerHTML = children as string;
        Array.from(container.children).forEach((child) => {
          head.appendChild(child);
        });
      }
    }, [children]);
    return null;
  }

  if (__XANIX_SERVER__) {
    return (
      <head>
        {children}
        <script
          id={pageId}
          dangerouslySetInnerHTML={{
            __html: `window.XANIX_DOCUMENT = ${JSON.stringify({
              pageId,
              props,
              params,
              metadata,
              usedata,
            })};
        `,
          }}
        ></script>
        <script
          type="module"
          src={`/${outdirs.client}/${__XANIX_CLIENT_RUNTIME_FILE_NAME__}.js`}
        ></script>
      </head>
    );
  }
};

export default Head;
