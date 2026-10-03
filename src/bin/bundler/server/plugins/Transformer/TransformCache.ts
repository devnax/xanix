import crypto from "node:crypto";

class TransformCache {
  replacements: {
    start: number;
    end: number;
    value: string;
  }[] = [];

  code: string;
  cacheImported = false;
  importer: string;
  count = 0;
  constructor(code: string, importer: string) {
    this.code = code;
    this.importer = importer;
  }

  transform(node: any) {
    // check server imported
    if (
      node.type === "ImportDeclaration" &&
      node.source.value === "xanix" &&
      node.specifiers.some(
        (s: any) => s.type === "ImportSpecifier" && s.imported.name === "cache",
      )
    ) {
      this.cacheImported = true;
    }

    if (
      node.type === "CallExpression" &&
      node.callee.type === "Identifier" &&
      node.callee.name === "cache" &&
      (node.arguments.length === 1 || node.arguments.length === 2)
    ) {
      const id = crypto
        .createHash("sha256")
        .update(this.importer + this.count++)
        .digest("hex")
        .slice(0, 12);

      if (node.arguments.length === 1) {
        this.replacements.push({
          start: node.arguments[0].end,
          end: node.arguments[0].end,
          value: `, undefined, "${id}"`,
        });
      } else {
        this.replacements.push({
          start: node.arguments[1].end,
          end: node.arguments[1].end,
          value: `, "${id}"`,
        });
      }
    }
  }
}

export default TransformCache;
