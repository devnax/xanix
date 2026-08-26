import { renderToPipeableStream, renderToString } from "react-dom/server";
import readManifest from "./readManifest.js";
import { PassThrough } from "node:stream";
import { XanixPageData } from "../types.js";
export interface XanixProps {
  clientId: string;
  req: any;
  res: any;
  component: React.ReactElement;
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
  clientId,
  req,
  res,
  component,
}: XanixProps) {
  const manifest = await readManifest();
  const entry = manifest.entries.find((item) => item.id === clientId);
  const props: Record<string, any> = component.props || {};
  const method = req.method.toUpperCase();
  if (method !== "GET") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  if ("x-navigation" in req.headers) {
    res.json({
      pageId: clientId,
      props,
    });
    return;
  }

  if (!entry) {
    throw new Error(
      `Xanix client entry "${clientId}" was not found in the manifest.`,
    );
  }

  const html = await renderPage(component);
  const {
    title,
    meta,
    scripts,
    styles,
    headerHtml,
    footerHtml,
  }: XanixPageData = req.xanixPageData || {};

  let metaTags = "";
  if (meta && Array.isArray(meta)) {
    metaTags = meta
      .map((m) => `<meta name="${m.name}" content="${m.content}" />`)
      .join("\n");
  }

  let headScriptTags = "";
  let footerScriptTags = "";
  if (scripts && Array.isArray(scripts)) {
    scripts.forEach((s) => {
      const tag = `<script src="${s.src}" type="${s.type || "text/javascript"}"></script>`;
      if (s.placement === "head") {
        headScriptTags += tag + "\n";
      } else {
        footerScriptTags += tag + "\n";
      }
    });
  }

  let styleTags = "";
  if (styles && Array.isArray(styles)) {
    styleTags = styles
      .map((s) => `<link rel="stylesheet" href="${s.href}" />`)
      .join("\n");
  }

  let headerContent = "";
  let footerContent = "";
  if (headerHtml) {
    headerContent = renderToString(headerHtml);
  }
  if (footerHtml) {
    footerContent = renderToString(footerHtml);
  }

  return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title || entry.name}</title>
    <script type="module" src="/.xanix/client/runtime.js"></script>
    ${metaTags}
    ${styleTags}
    ${headScriptTags}
    ${headerContent}
  </head>
  <body>
    <div id="root">
      ${html}
      <script type="module" id="xanix-data">
        window.xanix(${JSON.stringify({ props, pageId: clientId })});
      </script>
    </div>
    ${footerContent}
    ${footerScriptTags}
  </body>
</html>
  `;
}
