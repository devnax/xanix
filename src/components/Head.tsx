import { useEffect, useMemo } from "react";
import { useDocument } from "./Document/context.js";

type HeadProps = {
  children?: React.ReactNode;
};

const Head = ({ children }: HeadProps) => {
  const { title, meta, pageId, props } = useDocument();
  useEffect(() => {
    // update the document head when children change
    // document.title = title || "";
    // meta?.forEach(({ name, content }) => {
    //   let element = document.querySelector(`meta[name="${name}"]`);
    //   if (!element) {
    //     element = document.createElement("meta");
    //     element.setAttribute("name", name);
    //     document.head.appendChild(element);
    //   }
    //   element.setAttribute("content", content);
    // });
    // // add children
    // const head = document.head;
    // if (children) {
    //   const container = document.createElement("div");
    //   container.innerHTML = children as string;
    //   Array.from(container.children).forEach((child) => {
    //     head.appendChild(child);
    //   });
    // }
  }, [children]);
  if (typeof window !== "undefined") return <></>;

  return (
    <head>
      <title>{title}</title>
      {meta?.map(({ name, content }) => (
        <meta key={name} name={name} content={content} />
      ))}
      {children}
      {pageId && (
        <script
          id={pageId}
          dangerouslySetInnerHTML={{
            __html: `window.XANIX_DOCUMENT = ${JSON.stringify({
              pageId,
              props,
              meta,
              title,
            })};
        `,
          }}
        ></script>
      )}
      <script type="module" src={"/.xanix/client/xanix-runtime.js"}></script>
    </head>
  );
};

export default Head;
