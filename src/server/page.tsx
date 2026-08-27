import { renderToPipeableStream, renderToString } from "react-dom/server";
import type { ComponentType } from "react";
import readManifest from "./readManifest.js";
import { PassThrough } from "node:stream";
import { XanixDocumentData } from "../types.js";
import Document from "../BaseDocument.js";
export interface XanixProps {
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
}: XanixProps) {
  const manifest = await readManifest();

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
      pageId: pageId,
      props,
    });
  }
  const { title, meta }: XanixDocumentData = req.XanixDocumentData || {};

  const html = await renderPage(
    <Document
      document={{
        pageId: pageId,
        props,
        title,
        meta,
        runtime: `/.xanix/client/xanix-runtime.js`,
      }}
    >
      <Component {...props} />
    </Document>,
  );

  return html;

  //   let metaTags = "";
  //   if (meta && Array.isArray(meta)) {
  //     metaTags = meta
  //       .map((m) => `<meta name="${m.name}" content="${m.content}" />`)
  //       .join("\n");
  //   }

  //   scripts.push({
  //     src: `/.xanix/client/xanix-runtime.js`,
  //     type: "module",
  //     placement: "head",
  //   });

  //   let headScriptTags = "";
  //   let footerScriptTags = "";
  //   if (scripts && Array.isArray(scripts)) {
  //     scripts.forEach((s) => {
  //       const tag = `<script src="${s.src}" type="${s.type || "text/javascript"}"></script>`;
  //       if (s.placement === "head") {
  //         headScriptTags += tag + "\n";
  //       } else {
  //         footerScriptTags += tag + "\n";
  //       }
  //     });
  //   }

  //   let styleTags = "";
  //   if (styles && Array.isArray(styles)) {
  //     styleTags = styles
  //       .map((s) => `<link rel="stylesheet" href="${s.href}" />`)
  //       .join("\n");
  //   }

  //   let headerContent = "";
  //   let footerContent = "";
  //   if (headerHtml) {
  //     headerContent = renderToString(headerHtml);
  //   }
  //   if (footerHtml) {
  //     footerContent = renderToString(footerHtml);
  //   }

  //   if ("x-navigation" in req.headers) {
  //     res.setHeader("Content-Type", "application/json");
  //     return JSON.stringify({
  //       pageId: pageId,
  //       props,
  //       headerHtml,
  //       footerHtml,
  //       meta,
  //       scripts,
  //       styles,
  //     });
  //   }

  //   return `
  // <!DOCTYPE html>
  // <html lang="en">
  //   <head>
  //     <meta charset="UTF-8" />
  //     <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  //     <title>${title || entry.name}</title>
  //     ${metaTags}
  //     ${styleTags}
  //     ${headScriptTags}
  //     ${headerContent}
  //   </head>
  //   <body>
  //     ${html}
  //     <script type="module" id="xanix-data">
  //       window.xanix(${JSON.stringify({ props, pageId: pageId })});
  //     </script>
  //     ${footerContent}
  //     ${footerScriptTags}
  //   </body>
  // </html>
  //   `;
}
