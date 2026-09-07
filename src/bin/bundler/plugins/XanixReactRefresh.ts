import type { Plugin } from "rollup";
import path from "node:path";
import fs from "node:fs";

import { parse } from "@babel/parser";
import traverse from "@babel/traverse";
import generate from "@babel/generator";
import * as t from "@babel/types";

import { getClientRuntimeFile } from "../../include/utils.js";

const root = process.cwd();

export default function xanixReactRefresh(webSocketPort: number): Plugin {
  return {
    name: "xanix-react-refresh",

    load(id) {
      if (path.resolve(id) !== getClientRuntimeFile()) {
        return null;
      }

      const code = fs.readFileSync(id, "utf8");

      const refreshCode = `

${code}
import * as RefreshRuntime from "react-refresh/runtime";

RefreshRuntime.injectIntoGlobalHook(window);

window.$RefreshReg$ = (type, id) => {
  RefreshRuntime.register(type, id);
};

window.$RefreshSig$ = RefreshRuntime.createSignatureFunctionForTransform;


const ws = new WebSocket(
  ${JSON.stringify(`ws://localhost:${webSocketPort}`)}
);

ws.onmessage = async (event) => {
  const files = JSON.parse(event.data);

  for (const file of files) {
    if (!file.endsWith(".js")) {
      continue;
    }

    const url =
      getImportUrl(file.replace(/\\.js$/, "")) +
      "?t=" +
      Date.now();

    await import(url);
  }

  RefreshRuntime.performReactRefresh();

  ws.send("reload");
};
`;

      return {
        code: refreshCode,
        map: null,
      };
    },

    transform(code, id) {
      const resolvedId = path.resolve(id);

      if (resolvedId === getClientRuntimeFile()) {
        return null;
      }

      if (id.includes("node_modules")) {
        return null;
      }

      if (!/\.(tsx?|jsx?)$/.test(id)) {
        return null;
      }

      const ast = parse(code, {
        sourceType: "module",
        plugins: ["typescript", "jsx"],
      });

      const registrations: t.Statement[] = [];

      traverse(ast, {
        FunctionDeclaration(path) {
          const node = path.node;

          if (!node.id) {
            return;
          }

          const name = node.id.name;

          if (!isReactComponent(name)) {
            return;
          }

          registrations.push(createRegistration(name, id));
        },

        VariableDeclarator(path) {
          const node = path.node;

          if (!t.isIdentifier(node.id)) {
            return;
          }

          const name = node.id.name;

          if (!isReactComponent(name)) {
            return;
          }

          if (
            !t.isArrowFunctionExpression(node.init) &&
            !t.isFunctionExpression(node.init)
          ) {
            return;
          }

          registrations.push(createRegistration(name, id));
        },
      });

      if (registrations.length === 0) {
        return null;
      }

      ast.program.body.push(...registrations);

      const result = generate(
        ast,
        {
          sourceMaps: true,
          sourceFileName: id,
        },
        code,
      );

      return {
        code: result.code,
        map: result.map,
      } as any;
    },
  };
}

function isReactComponent(name: string): boolean {
  return /^[A-Z][A-Za-z0-9_$]*$/.test(name);
}

function createRegistration(
  name: string,
  filename: string,
): t.ExpressionStatement {
  const relative = path.relative(root, filename).replaceAll("\\", "/");

  const componentId = `${relative}:${name}`;

  return t.expressionStatement(
    t.callExpression(t.identifier("$RefreshReg$"), [
      t.identifier(name),
      t.stringLiteral(componentId),
    ]),
  );
}
