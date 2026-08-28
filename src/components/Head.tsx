import { useDocument } from "./Document/context.js";

type HeadProps = {
  children?: React.ReactNode;
};

const Head = ({ children }: HeadProps) => {
  const { title, meta, pageId, props } = useDocument();
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
