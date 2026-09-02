import { parse } from "@babel/parser";
import traverse from "@babel/traverse";
import generate from "@babel/generator";
import * as t from "@babel/types";

import type { Plugin } from "rollup";

const RUNTIME_IMPORT = "xanix/runtime";

function findExpressServer(ast: t.File): string | null {
  let appName: string | null = null;

  traverse(ast, {
    CallExpression(path) {
      const node = path.node;

      // Find:
      // app.listen(...)
      if (
        !t.isMemberExpression(node.callee) ||
        !t.isIdentifier(node.callee.property, {
          name: "listen",
        }) ||
        !t.isIdentifier(node.callee.object)
      ) {
        return;
      }

      const variableName = node.callee.object.name;

      // Find the binding of `app`
      const binding = path.scope.getBinding(variableName);

      if (!binding || !binding.path.isVariableDeclarator()) {
        return;
      }

      const init = binding.path.node.init;

      // Confirm:
      // const app = express();
      if (
        t.isCallExpression(init) &&
        t.isIdentifier(init.callee, {
          name: "express",
        })
      ) {
        appName = variableName;

        path.stop();
      }
    },
  });

  return appName;
}

function injectRuntimeImport(ast: t.File): void {
  let runtimeImport: t.ImportDeclaration | null = null;

  for (const statement of ast.program.body) {
    if (
      t.isImportDeclaration(statement) &&
      statement.source.value === RUNTIME_IMPORT
    ) {
      runtimeImport = statement;
      break;
    }
  }

  if (runtimeImport) {
    const exists = runtimeImport.specifiers.some(
      (specifier) =>
        t.isImportSpecifier(specifier) &&
        t.isIdentifier(specifier.imported, {
          name: "createXanixServer",
        }),
    );

    if (!exists) {
      runtimeImport.specifiers.push(
        t.importSpecifier(
          t.identifier("createXanixServer"),
          t.identifier("createXanixServer"),
        ),
      );
    }

    return;
  }

  ast.program.body.unshift(
    t.importDeclaration(
      [
        t.importSpecifier(
          t.identifier("createXanixServer"),
          t.identifier("createXanixServer"),
        ),
      ],
      t.stringLiteral(RUNTIME_IMPORT),
    ),
  );
}

export interface XanixServerTransformOptions {
  mode: "watch" | "start";
}

export default function XanixServerTransform(
  options: XanixServerTransformOptions,
): Plugin {
  return {
    name: "xanix-server-transform",

    transform(code, id) {
      // Ignore node_modules
      if (id.includes("node_modules")) {
        return null;
      }

      // Only process JS/TS files
      if (!/\.[cm]?[jt]sx?$/.test(id)) {
        return null;
      }

      let ast: t.File;

      try {
        ast = parse(code, {
          sourceType: "module",
          plugins: ["typescript", "jsx"],
        });
      } catch {
        return null;
      }

      // Find the REAL server app
      const appName = findExpressServer(ast);

      if (!appName) {
        return null;
      }

      let changed = false;

      traverse(ast, {
        VariableDeclarator(path) {
          const node = path.node;

          // Only transform:
          // const app = express()
          if (
            !t.isIdentifier(node.id, {
              name: appName,
            })
          ) {
            return;
          }

          if (
            !t.isCallExpression(node.init) ||
            !t.isIdentifier(node.init.callee, {
              name: "express",
            })
          ) {
            return;
          }

          node.init = t.callExpression(t.identifier("createXanixServer"), [
            t.objectExpression([
              t.objectProperty(
                t.identifier("mode"),
                t.stringLiteral(options.mode),
              ),
            ]),
          ]);

          changed = true;

          path.stop();
        },
      });

      if (!changed) {
        return null;
      }

      injectRuntimeImport(ast);

      const output = generate(
        ast,
        {
          sourceMaps: true,
          sourceFileName: id,
        },
        code,
      );

      return {
        code: output.code,
        map: output.map,
      } as any;
    },
  };
}
