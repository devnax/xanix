import { renderToPipeableStream, renderToString } from "react-dom/server";
import readManifest from "./readManifest.js";
import { PassThrough } from "node:stream";
import dataLoader from "../../dataLoader.js";
import XanixRedirect from "../../classes/XanixRedirect.js";

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

  const { default: Document, metadata } =
    await import("virtual:xanix-document");

  const _metadata = await metadata(req, {
    pageId,
    name: entry.name,
  });

  if (!dataLoader.isInit(pageId)) {
    try {
      renderToString(
        <Document
          metadata={_metadata}
          request={req}
          response={res}
          page={{
            id: pageId,
            props,
          }}
          document={{
            pageId,
            props,
            params: req.params,
            metadata: _metadata,
            request: req,
            response: res,
            usedata: {},
          }}
        >
          <Component {...props} />
        </Document>,
      );
    } catch (error) {
      if (error instanceof XanixRedirect) {
        res.redirect(error.status, error.location);
        return;
      }
      throw error;
    }
  }

  const usedata = await dataLoader.results(pageId);

  if ("x-navigation" in req.headers) {
    res.setHeader("Content-Type", "application/json");
    return JSON.stringify({
      pageId,
      props,
      params: req.params,
      metadata: _metadata,
      usedata,
    });
  }

  try {
    const html = await renderPage(
      <Document
        metadata={_metadata}
        request={req}
        response={res}
        page={{
          id: pageId,
          props,
        }}
        document={{
          pageId,
          props,
          params: req.params,
          metadata: _metadata,
          request: req,
          response: res,
          usedata,
        }}
      >
        <Component {...props} />
      </Document>,
    );
    return `<!DOCTYPE html>${html}`;
  } catch (error) {
    if (error instanceof XanixRedirect) {
      res.redirect(error.status, error.location);
      return;
    }
    throw error;
  }
}

const page = async () => {};
