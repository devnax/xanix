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
  uid: string;
  constructor(code: string, importer: string, uid: string) {
    this.code = code;
    this.importer = importer;
    this.uid = uid;
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
      const id = this.uid + this.count++;

      if (node.arguments.length === 2) {
        const optionNode = node.arguments[1];
        const optionString = this.code.slice(optionNode.start, optionNode.end);
        this.replacements.push({
          start: node.start,
          end: node.end,
          value: `server(undefined, ${optionString}, "${id}")`,
        });
        return;
      }

      this.replacements.push({
        start: node.start,
        end: node.end,
        value: `server(undefined, undefined, "${id}")`,
      });
    }
  }
}

export default TransformServerAction;
