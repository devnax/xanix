import { renderToPipeableStream } from "react-dom/server";
import readManifest from "./readManifest.js";
import { PassThrough } from "node:stream";
import path from "node:path";
import { pathToFileURL } from "node:url";

interface XanixPageProps {
  pageId: string;
  req: any;
  res: any;
  Component: (props: Record<string, any>) => React.ReactElement;
  props: Record<string, any>;
}

function renderPage(element: React.ReactElement): Promise<string> {
  return new Promise((resolve, reject) => {
    let html = "";
    const stream = new PassThrough();
    stream.on("data", (chunk) => {
      html += chunk.toString();
    });

    stream.on("end", () => {
      resolve(html);
    });

    stream.on("error", reject);

    const { pipe } = renderToPipeableStream(element, {
      onAllReady() {
        pipe(stream);
      },

      onError(error) {
        console.error("SSR error:", error);
      },
    });
  });
}

export default async function xanix_page({
  pageId,
  req,
  res,
  Component,
  props,
}: XanixPageProps) {
  const manifest = await readManifest();
  const { title, meta } = req.XanixPageData as {
    title: string;
    meta: Array<{ name: string; content: string }>;
  };
  const entry = manifest.entries.find((item) => item.id === pageId);
  const method = req.method.toUpperCase();
  if (method !== "GET") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  if (!entry) {
    throw new Error(
      `Xanix client entry "${pageId}" was not found in the manifest.`,
    );
  }

  if ("x-navigation" in req.headers) {
    res.setHeader("Content-Type", "application/json");
    return JSON.stringify({
      pageId,
      props,
      title: title ?? entry.name.replaceAll("-", " "),
      meta,
      params: req.params,
      request: null,
    });
  }
  const Document = (
    await import(
      pathToFileURL(path.join(process.cwd(), ".xanix", "xanix-document.js"))
        .href
    )
  ).default;

  const html = await renderPage(
    <Document
      document={{
        pageId,
        props,
        title: title ?? entry.name.replaceAll("-", " "),
        meta,
        params: req.params,
        request: req,
      }}
    >
      <Component {...props} />
    </Document>,
  );

  return `<!DOCTYPE html>${html}`;
}
