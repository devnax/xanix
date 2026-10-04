import { renderToPipeableStream } from "react-dom/server";
import { PassThrough } from "node:stream";
import Document, { metadata } from "virtual:xanix-document";
import { ReactElement } from "react";
import { DocumentProvider } from "../../components/DocumentContext";
import { UseServerResource, UseServerResult } from "../../hooks/useServer";
import { encode } from "@msgpack/msgpack";

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

    if (didError) {
      reject(new Error("SSR rendering failed"));
    }

    setTimeout(() => {
      abort();
    }, 10_000);
  });
}

interface XPageProps {
  component: ReactElement;
  req: any;
  res: any;
  props: Record<string, any>;
}

const __xpage = async (
  { component, req, res }: XPageProps,
  isNavigation: boolean,
) => {
  const props: any = component?.props;
  const pageInfo = props?.__xpage || {};
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname + url.search;

  const _metadata = await metadata({
    request: req,
    response: res,
    page: {
      id: pageInfo.id,
      name: pageInfo.name,
      props,
    },
  });

  const App = (
    <DocumentProvider
      value={{
        page: {
          id: pageInfo.id,
          name: pageInfo.name,
          props,
        },
        metadata: _metadata as any,
        params: {},
        path,
        request: req,
        response: res,
        pagedata: {},
      }}
    >
      <Document>{component}</Document>
    </DocumentProvider>
  );

  let html = await renderPage(App);
  let useServerData: Record<string, any> = {};

  for (const [key, value] of UseServerResult.entries()) {
    useServerData[key] = value;
  }

  UseServerResult.clear();
  UseServerResource.clear();

  if (isNavigation) {
    res.setHeader("Content-Type", "application/json");
    return JSON.stringify({
      page: {
        id: pageInfo.id,
        name: pageInfo.name,
        props,
      },
      metadata: _metadata as any,
      params: req.params || {},
      path,
      pagedata: useServerData,
    });
  }

  const scripts: string[] = [];
  if (__XANIX_DEV__) {
    scripts.push(
      `<script id="__DEV__">
        window.$RefreshReg$ = (type, id) => {};
        window.$RefreshSig$ = () => (type) => type;
      </script>`,
    );
  }
  scripts.push(
    `<script>window.__XPAGEDATA = ${JSON.stringify(useServerData)}</script>`,
  );
  html = html.replace("<head>", `<head>${scripts.join("\n")}`);

  return `<!DOCTYPE html>${html}`;
};

export default __xpage;
