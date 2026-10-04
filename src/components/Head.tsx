import { useEffect } from "react";
import useDocument from "../hooks/useDocument.js";
import outdirs from "../outdirs.js";

type HeadProps = {
  children?: React.ReactNode;
};

const Head = ({ children }: HeadProps) => {
  const { page, params, path, metadata, pagedata } = useDocument();
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
        {__XANIX_DEV__ && (
          <script id="__DEV__">{`
              window.$RefreshReg$ = (type, id) => {};
              window.$RefreshSig$ = () => (type) => type;
            `}</script>
        )}
        {children}
        <script
          id={page.id}
          dangerouslySetInnerHTML={{
            __html: `window.__XDOCUMENT = ${JSON.stringify({
              page: {
                id: page.id,
                name: page.name,
                props: page.props,
              },
              params,
              path,
              metadata,
              pagedata,
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
