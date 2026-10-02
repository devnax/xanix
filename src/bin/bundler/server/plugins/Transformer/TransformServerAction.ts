import crypto from "node:crypto";

class TransformServerAction {
  replacements: {
    start: number;
    end: number;
    value: string;
  }[] = [];

  code: string;
  importer: string;
  count = 0;
  constructor(code: string, importer: string) {
    this.code = code;
    this.importer = importer;
  }

  transform(node: any) {
    if (
      node.type === "CallExpression" &&
      node.callee.type === "Identifier" &&
      node.callee.name === "server" &&
      node.arguments.length === 1 &&
      (node.arguments[0].type === "ArrowFunctionExpression" ||
        node.arguments[0].type === "FunctionExpression")
    ) {
      const fnNode = node.arguments[0];
      const fnString = this.code.slice(fnNode.start, fnNode.end);

      const id = crypto
        .createHash("sha256")
        .update(this.importer + this.count++)
        .digest("hex")
        .slice(0, 12);

      this.replacements.push({
        start: node.start,
        end: node.end,
        value: `server(${fnString}, "${id}")`,
      });
    }
  }
}

export default TransformServerAction;
