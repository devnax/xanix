import crypto from "node:crypto";
import path from "node:path";

type Name = string;
type Entry = {
  name: string;
  id: string;
  source: string;
  resolved: string;
};

class TransformPage {
  _replacements: {
    start: number;
    end: number;
    value: string;
  }[] = [];

  imports: Map<Name, string> = new Map();
  entries: Entry[] = [];
  private identifiers: { name: string; placement: number }[] = [];

  get replacements() {
    for (const identifier of this.identifiers) {
      const source = this.imports.get(identifier.name);

      if (source) {
        const id = this.uid(source);

        this.entries.push({
          name: identifier.name,
          id,
          source,
          resolved: "",
        });

        this._replacements.push({
          start: identifier.placement,
          end: identifier.placement,
          value: ` __xpage={{ id: "${id}", name: "${identifier.name}" }} `,
        });
      }
    }
    return this._replacements;
  }

  uid(source: string) {
    return crypto
      .createHash("sha256")
      .update(source)
      .digest("hex")
      .slice(0, 12);
  }

  transform(node: any) {
    /* 
        res.send(<Home />) to 
        res.send(__xpage({
            id: uid,
            component: Home,
            props: {},
            request: req,
            response: res,
        })) 
    */

    if (
      node.type === "CallExpression" &&
      node.callee.property?.name === "send" &&
      node.arguments.length === 1 &&
      node.arguments[0].type === "JSXElement"
    ) {
      const element = node.arguments[0].openingElement;
      const ComponentName = element.name.name;
      const attrs = element.attributes;
      let end =
        attrs.length > 0 ? attrs[attrs.length - 1].end : element.name.end;
      this.identifiers.push({
        placement: end,
        name: ComponentName,
      });
    }

    // find static imports and add them to this.imports array
    if (
      node.type === "ImportDeclaration" &&
      node.specifiers.length > 0 &&
      node.specifiers[0].type === "ImportDefaultSpecifier"
    ) {
      const source = node.source.value;
      const specifier = node.specifiers[0].local.name;
      this.imports.set(specifier, source);
    }

    // find rfom require
    if (
      node.type === "VariableDeclaration" &&
      node.declarations.length === 1 &&
      node.declarations[0].init?.type === "CallExpression" &&
      node.declarations[0].init.callee.name === "require"
    ) {
      const source = node.declarations[0].init.arguments[0].value;
      const specifier = node.declarations[0].id.name;
      this.imports.set(specifier, source);
    }
  }
}

export default TransformPage;
