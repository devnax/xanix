import { createHash } from "node:crypto";
import { parse } from "@babel/parser";
import traverse from "@babel/traverse";
import generate from "@babel/generator";
import nodePath from "node:path";
import * as t from "@babel/types";

export default function xanixUseDataTransform() {
  return {
    name: "xanix-use-data-transform",

    transform(code: string, id: string) {
      if (!/\.[cm]?[jt]sx?$/.test(id)) {
        return null;
      }

      if (!code.includes("useData")) {
        return null;
      }

      const ast = parse(code, {
        sourceType: "module",

        plugins: ["typescript", "jsx"],
      });

      let changed = false;

      let counter = 0;

      const registrations: t.Statement[] = [];

      traverse(ast, {
        CallExpression(path) {
          const { node } = path;

          // Match useData(...)
          if (!t.isIdentifier(node.callee, { name: "useData" })) {
            return;
          }

          const callback = node.arguments[0];

          if (!callback) {
            return;
          }

          // First argument must be function
          if (
            !t.isFunctionExpression(callback) &&
            !t.isArrowFunctionExpression(callback)
          ) {
            return;
          }

          const args = node.arguments[1] ?? t.objectExpression([]);

          // Stable ID based on file + position
          const relative = nodePath
            .relative(process.cwd(), id)
            .replace(/\\/g, "/");

          const start = node.start ?? 0;

          const hash = createHash("sha256")
            .update(`${relative}:${start}`)
            .digest("hex");

          const xanixId = hash.slice(0, 12);

          // Generated hook name
          const hookName = `useXanixData${counter++}`;

          // Create:
          //
          // const useXanixData0 = useData.register(
          //   "id",
          //   callback
          // );

          const registration = t.variableDeclaration("const", [
            t.variableDeclarator(
              t.identifier(hookName),

              t.callExpression(
                t.memberExpression(
                  t.identifier("useData"),
                  t.identifier("register"),
                ),

                [t.stringLiteral(xanixId), callback as t.Expression],
              ),
            ),
          ]);

          registrations.push(registration);

          // Replace:
          //
          // useData(callback, args)
          //
          // with:
          //
          // useXanixData0(args)

          path.replaceWith(
            t.callExpression(t.identifier(hookName), [args as t.Expression]),
          );

          changed = true;
        },
      });

      if (!changed) {
        return null;
      }

      // Add registrations after imports
      const body = ast.program.body;

      let insertIndex = 0;

      while (
        insertIndex < body.length &&
        t.isImportDeclaration(body[insertIndex])
      ) {
        insertIndex++;
      }

      body.splice(insertIndex, 0, ...registrations);

      const output = generate(
        ast,
        {
          retainLines: true,
        },
        code,
      );

      return {
        code: output.code,
        map: null,
      } as any;
    },
  };
}
