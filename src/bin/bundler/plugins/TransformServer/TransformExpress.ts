class TransformExpress {
  replacements: {
    start: number;
    end: number;
    value: string;
  }[] = [];

  transform(node: any) {
    if (node.type === "ImportDeclaration" && node.source.value === "express") {
      this.replacements.push({
        start: node.source.start + 1,
        end: node.source.end - 1,
        value: "xanix/express",
      });
    }

    // check require express
    if (
      node.type === "CallExpression" &&
      node.callee.name === "require" &&
      node.arguments.length === 1 &&
      node.arguments[0].value === "express"
    ) {
      this.replacements.push({
        start: node.arguments[0].start + 1,
        end: node.arguments[0].end - 1,
        value: "xanix/express",
      });
    }
  }
}

export default TransformExpress;
