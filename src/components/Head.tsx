import { useEffect } from "react";
import useDocument from "../hooks/useDocument.js";
import outdirs from "../outdirs.js";

type HeadProps = {
  children?: React.ReactNode;
};

const Head = ({ children }: HeadProps) => {
  const { pageId, props, params, path, metadata, usedata } = useDocument();
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
          type="importmap"
          dangerouslySetInnerHTML={{
            __html: `{
  "imports": {
    "react-refresh/runtime": "/__cache__/react-refresh-runtime-17cd59259e1b.js",
    "react/jsx-runtime": "/__cache__/react-jsx-runtime-458b3eeba7b4.js",
    "react": "/__cache__/react-397813780668.js",
    "xanix": "/__cache__/xanix-b7382f3a97f8.js",
    "react-dom/client": "/__cache__/react-dom-client-c3c689a40d8b.js",
    "scheduler": "/__cache__/scheduler-c9df97c55968.js",
    "react-dom": "/__cache__/react-dom-c1635c20d78f.js"
  }
}`,
          }}
        />
        <script
          id={pageId}
          dangerouslySetInnerHTML={{
            __html: `window.XANIX_DOCUMENT = ${JSON.stringify({
              pageId,
              props,
              params,
              path,
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
