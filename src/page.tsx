import { renderToPipeableStream } from "react-dom/server";
import readManifest from "./readManifest.js";
import { PassThrough } from "node:stream";
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
  console.log(entry);

  if ("XANIX_PAGE" in req.headers) {
    return res.send(JSON.stringify({ page: {}, props: component.props }));
  }

  if (!entry) {
    throw new Error(
      `Xanix client entry "${clientId}" was not found in the manifest.`,
    );
  }

  const html = await renderPage(component);

  return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${entry.name}</title>
    <script type="module" src="/.xanix/client/runtime.js"></script>
  </head>
  <body>
    <div id="root">${html}</div>
    <script type="module" >
      window.PAGE_PROPS = ${JSON.stringify(component.props)};
    </script>
    <script type="module" src="/.xanix/client/pages/${entry.name.toLowerCase()}.js"></script>
  </body>
</html>
  `;
}
