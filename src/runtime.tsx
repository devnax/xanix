import { renderToString } from "react-dom/server";
import loadManifest from "./loadManifest.js";

export interface XanixProps {
  clientId: string;
  req: any;
  res: any;
  component: React.ReactElement;
}

export default async function xanix_runtime({
  clientId,
  req,
  res,
  component,
}: XanixProps) {
  const manifest = await loadManifest();
  const entry = manifest.entries.find((item) => item.id === clientId);

  if (!entry) {
    throw new Error(
      `Xanix client entry "${clientId}" was not found in the manifest.`,
    );
  }

  return renderToString(component);
}
