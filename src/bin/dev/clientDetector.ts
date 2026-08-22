import type { Plugin } from "rollup";
import ts from "typescript";

export interface ClientEntry {
  component: string;
  importer: string;
  source: string;
}

export type PluginOptions = {
  entries: Map<string, ClientEntry>;

  onChange: (
    id: string,
    change: {
      event: "update" | "delete" | "create";
    },
  ) => void;
};

export function detectReactRoutes({
  entries,
  onChange,
}: PluginOptions): Plugin {
  return {
    name: "xanix-client-detector",

    watchChange(id, change) {
      onChange(id, change);
    },

    async transform(code, id) {
      if (!/\.(tsx|jsx|ts|js)$/.test(id) || id.includes("node_modules")) {
        return null;
      }

      /*
       * Remove entries previously discovered
       */
      for (const [key, entry] of entries) {
        if (entry.source === id) {
          entries.delete(key);
        }
      }

      const sourceFile = ts.createSourceFile(
        id,
        code,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX,
      );

      /*
       * Component imports
       */
      const imports = new Map<string, string>();

      sourceFile.forEachChild((node) => {
        if (!ts.isImportDeclaration(node)) {
          return;
        }

        if (!node.importClause) {
          return;
        }

        const moduleSpecifier = node.moduleSpecifier;

        if (!ts.isStringLiteral(moduleSpecifier)) {
          return;
        }

        const defaultImport = node.importClause.name;
        if (!defaultImport) {
          return;
        }
        imports.set(defaultImport.text, moduleSpecifier.text);
      });

      /*
       * Find res.send(...)
       */
      const sendCalls: ts.CallExpression[] = [];

      function findSendCalls(node: ts.Node) {
        if (
          ts.isCallExpression(node) &&
          ts.isPropertyAccessExpression(node.expression)
        ) {
          if (node.expression.name.text === "send" && node.arguments.length) {
            sendCalls.push(node);
          }
        }

        ts.forEachChild(node, findSendCalls);
      }

      findSendCalls(sourceFile);

      /*
       * Find React components.
       */
      const components = new Set<string>();

      function findComponents(node: ts.Node) {
        if (ts.isJsxElement(node)) {
          inspectTag(node.openingElement.tagName);
        }

        if (ts.isJsxSelfClosingElement(node)) {
          inspectTag(node.tagName);
        }

        ts.forEachChild(node, findComponents);
      }

      function inspectTag(tagName: ts.JsxTagNameExpression) {
        const name = tagName.getText(sourceFile);

        if (!/^[A-Z]/.test(name)) {
          return;
        }

        components.add(name);
      }

      for (const call of sendCalls) {
        for (const argument of call.arguments) {
          findComponents(argument);
        }
      }

      /*
       * Resolve components.
       */
      for (const component of components) {
        const source = imports.get(component);

        if (!source) {
          continue;
        }

        const resolved = await this.resolve(source, id);

        if (!resolved || resolved.external) {
          continue;
        }

        const entry: ClientEntry = {
          component,
          importer: resolved.id,
          source: id,
        };

        entries.set(resolved.id, entry);
      }

      return null;
    },
  };
}
