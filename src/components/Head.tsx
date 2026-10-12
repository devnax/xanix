import { useEffect, type HTMLProps } from "react";
import useDocument from "../hooks/useDocument.js";
import outdirs from "../outdirs.js";
import { XanixAssets } from "../server/index.js";

type HeadProps = HTMLProps<HTMLHeadElement> & {
  children?: React.ReactNode;
};

const Head = ({ children, ...props }: HeadProps) => {
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
    let devScript = __XANIX_DEV__
      ? `window.$RefreshReg$ = (type, id) => {};window.$RefreshSig$ = () => (type) => type;`
      : "";
    return (
      <head {...props}>
        {children}
        {Array.from(XanixAssets.values())
          .filter((asset) => asset.type === "css")
          .map((asset) => (
            <link
              key={asset.path}
              rel="stylesheet"
              href={`assets/${asset.name}`}
            />
          ))}
        <script
          dangerouslySetInnerHTML={{
            __html: `${devScript}; window.__XDOCUMENT = ${JSON.stringify({
              page: {
                id: page.id,
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
      </head>
    );
  }
};

export default Head;
