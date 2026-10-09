import { renderToPipeableStream } from "react-dom/server";
import { PassThrough } from "node:stream";
import Document, { metadata } from "virtual:xanix-document";
import { ReactElement } from "react";
import { DocumentProvider } from "../../components/DocumentContext";
import { UseServerResource, UseServerResult } from "../../hooks/useServer";
import XanixRedirect from "../../classes/XanixRedirect";
import xanix from "..";
import { encode } from "@msgpack/msgpack";

function renderPage(element: React.ReactElement): Promise<string> {
  return new Promise((resolve, reject) => {
    let html = "";
    let settled = false;
    const stream = new PassThrough();
    const timeout = setTimeout(() => {
      abort();
      fail(new Error("SSR rendering timed out"));
    }, 10_000);

    const cleanup = () => clearTimeout(timeout);

    const fail = (error: unknown) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };

    const streamResult = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(html);
    };

    stream.on("data", (chunk) => {
      html += chunk.toString();
    });

    stream.on("end", streamResult);
    stream.on("error", fail);

    const { pipe, abort } = renderToPipeableStream(element, {
      onAllReady() {
        if (!settled) {
          pipe(stream);
        }
      },

      onError(error) {
        fail(error);
        abort();
      },

      onShellError(error) {
        fail(error);
      },
    });
  });
}

interface XPageProps {
  component: ReactElement;
  req: any;
  res: any;
  props: Record<string, any>;
  pageId: string;
}

const __xpage = async (
  { component, req, res, pageId }: XPageProps,
  isNavigation: boolean,
) => {
  const props: any = component?.props;
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname + url.search;

  xanix.emit("navigate:start", { path, request: req, response: res });

  const _metadata = await metadata({
    request: req,
    response: res,
    page: {
      id: pageId,
      props,
    },
  });

  try {
    const value = {
      path,
      request: req,
      response: res,
      metadata: _metadata as any,
      page: {
        id: pageId,
        props,
      },
      params: req.params || {},
      pagedata: {},
    };
    const App = (
      <DocumentProvider value={value}>
        <Document>{component}</Document>
      </DocumentProvider>
    );

    xanix.emit("page:before-render", value);
    let html = await renderPage(App);
    const context = {
      path,
      request: undefined,
      response: undefined,
      metadata: _metadata as any,
      page: {
        id: pageId,
        props,
      },
      params: req.params || {},
      pagedata: {} as any,
    };

    for (const [key, value] of UseServerResult.entries()) {
      context.pagedata[key] = value;
    }

    UseServerResult.clear();
    UseServerResource.clear();

    xanix.emit("page:after-render", context);
    xanix.emit("navigate:end", {
      ...context,
      request: req,
      response: res,
    });

    if (isNavigation) {
      res.setHeader("Content-Type", "application/xanix");
      return encode(context);
    }

    const scripts: string[] = [];

    scripts.push(
      `<script>window.__XPAGEDATA = ${JSON.stringify(context.pagedata)}</script>`,
    );
    html = html.replace("<head>", `<head>${scripts.join("\n")}`);

    return `${html}`;
  } catch (error: any) {
    if (error instanceof XanixRedirect) {
      if (!res.headersSent) {
        res.setHeader("Content-Type", "xanix/redirect");
        res.redirect(error.status, error.location);
      }

      return;
    }

    xanix.emit("navigation:error", {
      error,
      path,
      request: req,
      response: res,
    });

    throw error;
  }
};

export default __xpage;
