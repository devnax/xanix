class TransformServer {
  replacements: {
    start: number;
    end: number;
    value: string;
  }[] = [];

  foundServer = false;

  transform(node: any) {
    if (
      node.type === "CallExpression" &&
      node.callee.type === "Identifier" &&
      node.callee.name === "express"
    ) {
      this.foundServer = true;
      this.replacements.push({
        start: node.start,
        end: node.end,
        value: `xanix("express")`,
      });
    }
  }
}

export default TransformServer;
