import { renderToPipeableStream } from "react-dom/server";
import readManifest from "./readManifest.js";
import { PassThrough } from "node:stream";
import XanixRedirect from "../../classes/XanixRedirect.js";
import {
  clearExpiredUseServerResources,
  getPageResources,
} from "../../hooks/useServer/core.js";

interface XanixPageProps {
  component: () => Promise<{
    default: (props: Record<string, any>) => React.ReactElement;
  }>;
  pageId: string;
  req: any;
  res: any;
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
  component,
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
  const Component = (await component()).default;

  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname + url.search;
  clearExpiredUseServerResources();

  if (req.headers["x-xanix-page"] === __XANIX_PAGE_NAVIGATION_HEADER_VALUE__) {
    res.setHeader("Content-Type", "application/json");
    return JSON.stringify({
      pageId,
      props,
      params: req.params,
      path,
      metadata: _metadata,
    });
  }

  try {
    let html = await renderPage(
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
          path,
          metadata: _metadata,
          request: req,
          response: res,
        }}
      >
        <Component {...props} />
      </Document>,
    );

    const pageResources = getPageResources(pageId);
    const serverData: Record<string, any> = {};
    if (pageResources) {
      for (const [key, resource] of pageResources) {
        serverData[resource.uid] = resource.read();
      }
    }

    const scriptTag = `<script id="__USE_SERVER_DATA__">window.__USE_SERVER_DATA__ = ${JSON.stringify(
      serverData,
    )}</script>`;
    html = html.replace("<head>", `<head>${scriptTag}`);

    return `<!DOCTYPE html>${html}`;
  } catch (error) {
    if (error instanceof XanixRedirect) {
      res.redirect(error.status, error.location);
      return;
    }
    throw error;
  }
}
