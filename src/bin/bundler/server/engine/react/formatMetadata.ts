import type { Request, Response } from "express";
import { metadataToHtml } from "../../../../include/metadataToHtml";

const metadata = (page: any, layouts: any[], req: Request, res: Response) => {
  const metadatas: Record<string, any> = {};

  for (const layout of layouts) {
    if (typeof layout.metadata === "object") {
      Object.assign(metadatas, layout.metadata);
    } else if (typeof layout.metadata === "function") {
      Object.assign(metadatas, layout.metadata(req, res));
    }
  }

  if (page.metadata) {
    if (typeof page.metadata === "object") {
      Object.assign(metadatas, page.metadata);
    } else if (typeof page.metadata === "function") {
      Object.assign(metadatas, page.metadata(req, res));
    }
  }

  const html = metadataToHtml(metadatas);

  return { metadata, html };
};

export default metadata;
