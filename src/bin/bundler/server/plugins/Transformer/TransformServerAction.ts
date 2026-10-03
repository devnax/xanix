import crypto from "node:crypto";

class TransformServerAction {
  replacements: {
    start: number;
    end: number;
    value: string;
  }[] = [];

  code: string;
  serverImported = false;
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
        (s: any) =>
          s.type === "ImportSpecifier" && s.imported.name === "server",
      )
    ) {
      this.serverImported = true;
    }

    if (
      node.type === "CallExpression" &&
      node.callee.type === "Identifier" &&
      node.callee.name === "server" &&
      (node.arguments.length === 1 || node.arguments.length === 2) &&
      (node.arguments[0].type === "ArrowFunctionExpression" ||
        node.arguments[0].type === "FunctionExpression")
    ) {
      const fnNode = node.arguments[0];
      const optionNode = node.arguments[1];
      const fnString = this.code.slice(fnNode.start, fnNode.end);

      const id = crypto
        .createHash("sha256")
        .update(this.importer + this.count++)
        .digest("hex")
        .slice(0, 12);

      if (node.arguments.length === 2) {
        const optionString = this.code.slice(optionNode.start, optionNode.end);
        this.replacements.push({
          start: node.start,
          end: node.end,
          value: `server(${fnString}, ${optionString}, "${id}")`,
        });
        return;
      }

      this.replacements.push({
        start: node.start,
        end: node.end,
        value: `server(${fnString}, undefined, "${id}")`,
      });
    }
  }
}

export default TransformServerAction;
