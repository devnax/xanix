import { Document, Head, Body, type DocumentProps } from "./src/index.js";

if (typeof window !== "undefined") {
  // window.addEventListener("xanix:navigate:start", (event: any) => {
  //   console.log("Navigation started to:", event.detail.path);
  // });
  // window.addEventListener("xanix:navigate:end", (event: any) => {
  //   console.log("Navigation ended to:", event.detail.path);
  // });
}

const RootDocument = ({ children, document }: DocumentProps) => {
  const req = document.request;

  return (
    <Document document={document}>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        {req && <meta name="request-id" content={"req.id"} />}
      </Head>
      <Body>{children}</Body>
    </Document>
  );
};

export default RootDocument;
