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
    // check the server is imported: emple: import { server } from "xanix";
    if (
      !this.serverImported &&
      node.type === "ImportDeclaration" &&
      node.source.value === "xanix" &&
      node.specifiers.some(
        (s: any) => s.imported && s.imported.name === "server",
      )
    ) {
      this.serverImported = true;
    }

    if (
      node.type === "CallExpression" &&
      node.callee.name === "useServer" &&
      (node.arguments.length === 1 || node.arguments.length === 2) &&
      (node.arguments[0].type === "ArrowFunctionExpression" ||
        node.arguments[0].type === "FunctionExpression")
    ) {
      const fnNode = node.arguments[0];
      const argNode = node.arguments[1];
      const argString = argNode
        ? this.code.slice(argNode.start, argNode.end)
        : "{}";
      const fnString = this.code.slice(fnNode.start, fnNode.end);
      const id = crypto
        .createHash("sha256")
        .update("use-server" + this.importer + this.count++)
        .digest("hex")
        .slice(0, 12);

      this.serverCodes.push(`const _${id} = server(${fnString}, "${id}");`);
      this.replacements.push({
        start: node.start,
        end: node.end,
        value: `useServer(_${id}, ${argString}, "${id}")`,
      });
    }
  }
}
export default TransformUseServer;
