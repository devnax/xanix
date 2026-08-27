import { useDocument } from "./Document/context.js";

type HeadProps = {
  children?: React.ReactNode;
};

const Head = ({ children }: HeadProps) => {
  const { title, meta, runtime, pageId, props } = useDocument();
  return (
    <head>
      <title>{title}</title>
      {meta.map(({ name, content }) => (
        <meta key={name} name={name} content={content} />
      ))}
      {children}
      <script
        dangerouslySetInnerHTML={{
          __html: `window.PAGE_ID = "${pageId}";
        window.PROPS = ${JSON.stringify(props)};
        `,
        }}
      ></script>
      {runtime && <script type="module" src={runtime}></script>}
    </head>
  );
};

export default Head;
