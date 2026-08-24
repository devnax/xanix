import { renderToString } from "react-dom/server";
import readManifest from "./readManifest.js";

export interface XanixProps {
  clientId: string;
  req: any;
  res: any;
  component: React.ReactElement;
}

export default async function xanix_page({
  clientId,
  req,
  res,
  component,
}: XanixProps) {
  const manifest = await readManifest();
  const entry = manifest.entries.find((item) => item.id === clientId);

  if (!entry) {
    throw new Error(
      `Xanix client entry "${clientId}" was not found in the manifest.`,
    );
  }

  return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${entry.name}</title>
  </head>
  <body>
    <div id="root">${renderToString(component)}</div>
    <script type="module">
      import Page from "/__client__/pages/${entry.name}.js";
      import {hydrate} from "/__client__/runtime.js";
      hydrate(Page, ${JSON.stringify(component.props)});
    </script>
  </body>
</html>
  `;
}
