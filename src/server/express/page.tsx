import { renderToPipeableStream } from "react-dom/server";
import { PassThrough } from "node:stream";
import Document, { metadata } from "virtual:xanix-document";
import { ReactElement } from "react";
import { DocumentProvider } from "../../components/DocumentContext";
import {
  clearExpiredUseServerResources,
  getPageResources,
} from "../../hooks/useServer/core";

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
  clearExpiredUseServerResources();

  const _metadata = await metadata({
    request: req,
    response: res,
    page: {
      id: pageInfo.id,
      name: pageInfo.name,
      props,
    },
  });

  if (isNavigation) {
    res.setHeader("Content-Type", "application/json");
    return JSON.stringify({
      page: {
        id: pageInfo.id,
        name: pageInfo.name,
        props,
      },
      metadata: _metadata as any,
      params: {},
      path,
      usedata: {},
    });
  }

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
        usedata: {},
      }}
    >
      <Document>{component}</Document>
    </DocumentProvider>
  );

  let html = await renderPage(App);
  const pageResources = getPageResources(pageInfo.id);
  const serverData: Record<string, any> = {};
  if (pageResources) {
    for (const [key, resource] of pageResources) {
      serverData[resource.uid] = resource.read();
    }
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
    `<script id="__USE_SERVER_DATA__">window.__USE_SERVER_DATA__ = ${JSON.stringify(
      serverData,
    )}</script>`,
  );
  html = html.replace("<head>", `<head>${scripts.join("\n")}`);

  return `<!DOCTYPE html>${html}`;
};

export default __xpage;
