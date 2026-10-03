import crypto from "node:crypto";

class TransformUseServer {
  code: string;
  importer: string;
  count = 0;
  replacements: Array<{ start: number; end: number; value: string }> = [];
  serverImported = false;
  serverCodes: Array<string> = [];
  constructor(code: string, importer: string) {
    this.code = code;
    this.importer = importer;
  }
  transform(node: any) {
    // check variable __xanix exists
    if (
      node.type === "ImportDeclaration" &&
      node.source.value === "xanix" &&
      node.specifiers.some(
        (s: any) =>
          s.type === "ImportNamespaceSpecifier" && s.local.name === "__xanix",
      )
    ) {
      this.serverImported = true;
    }

    if (
      node.type === "CallExpression" &&
      node.callee.name === "useServer" &&
      (node.arguments.length === 1 ||
        node.arguments.length === 2 ||
        node.arguments.length === 3) &&
      (node.arguments[0].type === "ArrowFunctionExpression" ||
        node.arguments[0].type === "FunctionExpression")
    ) {
      const id = crypto
        .createHash("sha256")
        .update("use-server" + this.importer + this.count++)
        .digest("hex")
        .slice(0, 12);

      const argNode = node.arguments[1];
      const optionNode = node.arguments[2];
      const argString = argNode
        ? this.code.slice(argNode.start, argNode.end)
        : "{}";

      let optionString = "undefined";
      if (optionNode) {
        optionString = this.code.slice(optionNode.start, optionNode.end);
      }
      this.serverCodes.push(
        `const _${id} = __xanix.server(undefined, ${optionString}, "${id}");`,
      );
      this.replacements.push({
        start: node.start,
        end: node.end,
        value: `useServer(_${id}, ${argString}, "${id}")`,
      });
    }
  }
}
export default TransformUseServer;
