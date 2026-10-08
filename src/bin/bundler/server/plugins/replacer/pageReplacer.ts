import crypto from "node:crypto";
import { TransformPluginContext } from "rolldown";
import pageFinder from "../../../../modifier/pageFinder.js";
import { normalizePath } from "../../../../include/utils.js";
import { XanixClientEntry } from "../../../../types.js";

const uid = (source: string) => {
  return crypto.createHash("sha256").update(source).digest("hex").slice(0, 12);
};

const pageReplacer = async (
  importer: string,
  code: string,
  context: TransformPluginContext,
  entries: Map<string, XanixClientEntry>,
) => {
  if (!/\.send\(/.test(code)) {
    return code;
  }
  const pages = pageFinder(code).sort((a, b) => b.start - a.start);

  for (const page of pages) {
    const resolved = await context.resolve(page.source, importer, {
      skipSelf: true,
    });

    if (resolved) {
      const id = uid(resolved.id);
      entries.set(id, {
        id,
        source: page.source,
        resolved: normalizePath(resolved.id),
      });

      code =
        code.slice(0, page.start) +
        `${page.identifier}.send(${page.args[0]}, "${id}")` +
        code.slice(page.end);
    }
  }

  return code;
};

export default pageReplacer;
