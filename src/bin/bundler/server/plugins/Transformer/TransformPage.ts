import crypto from "node:crypto";
import { TransformPluginContext } from "rolldown";
import { normalizePath } from "../../../../include/utils.js";

type Name = string;
export type Entry = {
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
  entries: Map<string, Entry> = new Map();
  private identifiers: { name: string; placement: number }[] = [];
  private context: TransformPluginContext;
  private importer: string;
  constructor(
    context: TransformPluginContext,
    importer: string,
    entries: Map<string, Entry>,
  ) {
    this.context = context;
    this.importer = importer;
    this.entries = entries;
  }

  async replacements() {
    for (const identifier of this.identifiers) {
      const source = this.imports.get(identifier.name);

      if (source) {
        const resolved = await this.context.resolve(source, this.importer, {
          skipSelf: true,
        });

        if (resolved) {
          const id = this.uid(resolved.id);
          this.entries.set(id, {
            name: identifier.name,
            id,
            source,
            resolved: normalizePath(resolved.id),
          });

          this._replacements.push({
            start: identifier.placement,
            end: identifier.placement,
            value: ` __xpage={{ id: "${id}", name: "${identifier.name}" }} `,
          });
        }
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
