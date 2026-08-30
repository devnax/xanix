import { useEffect } from "react";
import useDocument from "./useDocument.js";

type HeadProps = {
  children?: React.ReactNode;
};

const Head = ({ children }: HeadProps) => {
  const { title, meta, pageId, props, params } = useDocument();
  useEffect(() => {
    document.title = title || "";
    meta?.forEach(({ name, content }) => {
      let element = document.querySelector(`meta[name="${name}"]`);
      if (!element) {
        element = document.createElement("meta");
        element.setAttribute("name", name);
        document.head.appendChild(element);
      }
      element.setAttribute("content", content);
    });
    // add children
    const head = document.head;
    if (children) {
      const container = document.createElement("div");
      container.innerHTML = children as string;
      Array.from(container.children).forEach((child) => {
        head.appendChild(child);
      });
    }
  }, [children]);

  if (__XANIX_CLIENT__) return <></>;

  return (
    <head>
      <title>{title}</title>
      {meta?.map(({ name, content }) => (
        <meta key={name} name={name} content={content} />
      ))}
      {children}
      <script
        id={pageId}
        dangerouslySetInnerHTML={{
          __html: `window.XANIX_DOCUMENT = ${JSON.stringify({
            pageId,
            props,
            meta,
            title,
            params,
            request: null,
          })};
        `,
        }}
      ></script>
      <script type="module" src={"/.xanix/client/xanix-runtime.js"}></script>
    </head>
  );
};

export default Head;
