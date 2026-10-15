import type { Request, Response } from "express";
import { Metadata } from "../../../types/metadata";
import { metadataToHtml } from "../../../include/code/metadataToHtml.js";

const formatMetadata = async (
  page: any,
  props: any,
  layouts: any[],
  req: Request,
  res: Response,
) => {
  const metadata: Metadata = {};

  for (const layout of layouts) {
    if (typeof layout.metadata === "object") {
      Object.assign(metadata, layout.metadata);
    } else if (typeof layout.metadata === "function") {
      Object.assign(metadata, await layout.metadata(req, res));
    }
  }

  if (typeof props.metadata === "object") {
    Object.assign(metadata, props.metadata);
  } else if (typeof props.metadata === "function") {
    Object.assign(metadata, await props.metadata(req, res));
  }

  if (typeof page.metadata === "object") {
    Object.assign(metadata, page.metadata);
  } else if (typeof page.metadata === "function") {
    Object.assign(metadata, await page.metadata(req, res));
  }

  const html = metadataToHtml(metadata);

  return { metadata, html };
};

export default formatMetadata;
