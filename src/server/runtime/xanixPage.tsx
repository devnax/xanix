import { renderToPipeableStream, renderToString } from "react-dom/server";
import readManifest from "./readManifest.js";
import { PassThrough } from "node:stream";
import path from "node:path";
import { pathToFileURL } from "node:url";
import dataLoader from "../../dataLoader.js";
import Document from "virtual:xanix-document";

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

    let didError = false;

    const { pipe, abort } = renderToPipeableStream(element, {
      onAllReady() {
        pipe(stream);
      },

      onError(error) {
        didError = true;
        console.error("SSR error:", error);
      },

      onShellError(error) {
        reject(error);
      },
    });

    // Optional timeout protection
    setTimeout(() => {
      abort();
    }, 10_000);
  });
}

export default async function xanixPage({
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
    res.status(404).send("Page Not Found");
    return;
  }

  const Document = (
    await import(
      pathToFileURL(
        path.join(
          process.cwd(),
          ".xanix",
          __XANIX_DOCUMENT_FILE_NAME__ + ".js",
        ),
      ).href
    )
  ).default;

  if (!dataLoader.isInit(pageId)) {
    renderToString(
      <Document
        document={{
          pageId,
          props,
          title: title ?? entry.name.replaceAll("-", " "),
          meta,
          params: req.params,
          request: req,
          pageData: {},
        }}
      >
        <Component {...props} />
      </Document>,
    );
  }

  const pageData = await dataLoader.results(pageId);

  if ("x-navigation" in req.headers) {
    res.setHeader("Content-Type", "application/json");
    return JSON.stringify({
      pageId,
      props,
      title: title ?? entry.name.replaceAll("-", " "),
      meta,
      params: req.params,
      request: null,
      pageData,
    });
  }

  const html = await renderPage(
    <Document
      document={{
        pageId,
        props,
        title: title ?? entry.name.replaceAll("-", " "),
        meta,
        params: req.params,
        request: req,
        pageData,
      }}
    >
      <Component {...props} />
    </Document>,
  );
  return `<!DOCTYPE html>${html}`;
}
