import { renderToString } from "react-dom/server";
import Document from "virtual:xanix-document";

const Page = (body: any) => {
  if (!(typeof body === "object" && body?.$$typeof && body?.props?.__xpage)) {
    return body;
  }

  const data = {};

  return renderToString(<Document document={data}>{body}</Document>);
};

export default Page;
