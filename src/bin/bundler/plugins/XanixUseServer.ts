import type { Plugin } from "rollup";

import { parse } from "@babel/parser";
import traverse from "@babel/traverse";
import generate from "@babel/generator";
import * as t from "@babel/types";

import crypto from "node:crypto";
import path from "node:path";

type Options = {
  isClient: boolean;
  root?: string;
};

/* ============================================================
   Utils
   ============================================================ */

const normalizePath = (value: string): string => value.replace(/\\/g, "/");

const createUID = (file: string, index: number): string =>
  crypto
    .createHash("sha256")
    .update(`${file}:${index}`)
    .digest("hex")
    .slice(0, 16);

const getExpression = (
  value: t.CallExpression["arguments"][number] | undefined,
): t.Expression | undefined => {
  if (!value) {
    return undefined;
  }

  return t.isExpression(value) ? value : undefined;
};

/* ============================================================
   Find local useServer name

   import { useServer } from "xanix";

   import {
     useServer as server
   } from "xanix";
   ============================================================ */

const getUseServerName = (ast: t.File): string | null => {
  for (const statement of ast.program.body) {
    if (!t.isImportDeclaration(statement)) {
      continue;
    }

    if (statement.source.value !== "xanix") {
      continue;
    }

    for (const specifier of statement.specifiers) {
      if (!t.isImportSpecifier(specifier)) {
        continue;
      }

      if (
        t.isIdentifier(specifier.imported) &&
        specifier.imported.name === "useServer"
      ) {
        return specifier.local.name;
      }

      if (
        t.isStringLiteral(specifier.imported) &&
        specifier.imported.value === "useServer"
      ) {
        return specifier.local.name;
      }
    }
  }

  return null;
};

/* ============================================================
   Detect:

   useServer(...)
   ============================================================ */

const isUseServer = (node: t.CallExpression, localName: string): boolean =>
  t.isIdentifier(node.callee) && node.callee.name === localName;

/* ============================================================
   Create:

   {
     uid: "abc",
     args: {
       id
     }
   }

   OR, if args itself is an object:

   {
     uid: "abc",
     args: {
       ...args
     }
   }

   IMPORTANT:

   New runtime API:

   useServer({
     uid,
     args
   })

   ============================================================ */

function createServerRequest(
  props: t.Expression | undefined,
  uid: string,
): t.ObjectExpression {
  let args: t.Expression;

  if (!props) {
    args = t.objectExpression([]);
  } else {
    args = t.cloneNode(props, true);
  }

  return t.objectExpression([
    t.objectProperty(t.identifier("uid"), t.stringLiteral(uid)),

    t.objectProperty(t.identifier("args"), args),
  ]);
}

/* ============================================================
   Add registerUseServer import

   Existing:

   import { useServer } from "xanix";

   becomes:

   import {
     useServer,
     registerUseServer
   } from "xanix";

   ============================================================ */

function addRegisterUseServerImport(ast: t.File): void {
  let xanixImport: t.ImportDeclaration | undefined;

  for (const statement of ast.program.body) {
    if (
      t.isImportDeclaration(statement) &&
      statement.source.value === "xanix"
    ) {
      xanixImport = statement;
      break;
    }
  }

  if (xanixImport) {
    const exists = xanixImport.specifiers.some((specifier) => {
      if (!t.isImportSpecifier(specifier)) {
        return false;
      }

      if (t.isIdentifier(specifier.imported)) {
        return specifier.imported.name === "registerUseServer";
      }

      if (t.isStringLiteral(specifier.imported)) {
        return specifier.imported.value === "registerUseServer";
      }

      return false;
    });

    if (!exists) {
      xanixImport.specifiers.push(
        t.importSpecifier(
          t.identifier("registerUseServer"),
          t.identifier("registerUseServer"),
        ),
      );
    }

    return;
  }

  ast.program.body.unshift(
    t.importDeclaration(
      [
        t.importSpecifier(
          t.identifier("registerUseServer"),
          t.identifier("registerUseServer"),
        ),
      ],
      t.stringLiteral("xanix"),
    ),
  );
}

/* ============================================================
   CLIENT

   Source:

   useServer(
     async ({ id }) => getUser(id),
     { id }
   )

   becomes:

   useServer({
     uid: "abc123",
     args: {
       id
     }
   })

   ============================================================ */

function transformClient(ast: t.File, filePath: string, useServerName: string) {
  let index = 0;
  let changed = false;

  traverse(ast, {
    CallExpression(callPath) {
      const node = callPath.node;

      if (!isUseServer(node, useServerName)) {
        return;
      }

      const callback = node.arguments[0];

      if (!callback || !t.isFunction(callback)) {
        return;
      }

      const props = getExpression(node.arguments[1]);

      const uid = createUID(filePath, index);

      index++;

      const request = createServerRequest(props, uid);

      node.arguments = [request];

      changed = true;

      callPath.skip();
    },
  });

  if (!changed) {
    return null;
  }

  const output = generate(ast, {
    comments: true,
  });

  return {
    code: output.code,
    map: output.map,
  };
}

/* ============================================================
   SERVER

   Source:

   const App = ({ id }) => {

     const user = useServer(
       async ({ id }) => getUser(id),
       { id }
     );

     return <h1>{user.name}</h1>;
   };

   becomes:

   import {
     useServer,
     registerUseServer
   } from "xanix";

   registerUseServer(
     "abc123",
     async ({ id }) => getUser(id)
   );

   const App = ({ id }) => {

     const user = useServer({
       uid: "abc123",
       args: { id }
     });

     return <h1>{user.name}</h1>;
   };

   IMPORTANT:

   App stays synchronous.

   No:

     async function App()

   No:

     DynamicName

   No:

     Suspense

   No:

     await useServer()

   ============================================================ */

function transformServer(ast: t.File, filePath: string, useServerName: string) {
  let index = 0;
  let changed = false;

  const registrations: t.Statement[] = [];

  traverse(ast, {
    CallExpression(callPath) {
      const node = callPath.node;

      if (!isUseServer(node, useServerName)) {
        return;
      }

      const callback = node.arguments[0];

      if (!callback || !t.isFunction(callback)) {
        return;
      }

      const props = getExpression(node.arguments[1]);

      const uid = createUID(filePath, index);

      index++;

      /* ======================================================
         Register server callback

         registerUseServer(
           "abc123",
           async ({ id }) => getUser(id)
         );
         ====================================================== */

      registrations.push(
        t.expressionStatement(
          t.callExpression(t.identifier("registerUseServer"), [
            t.stringLiteral(uid),

            t.cloneNode(callback, true),
          ]),
        ),
      );

      /* ======================================================
         Replace component call

         BEFORE:

         useServer(
           async ({ id }) => getUser(id),
           { id }
         )

         AFTER:

         useServer({
           uid: "abc123",
           args: { id }
         })
         ====================================================== */

      const request = createServerRequest(props, uid);

      const call = t.callExpression(t.identifier(useServerName), [request]);

      callPath.replaceWith(call);

      changed = true;

      callPath.skip();
    },
  });

  if (!changed) {
    return null;
  }

  /* ==========================================================
     Add registerUseServer import
     ========================================================== */

  addRegisterUseServerImport(ast);

  /* ==========================================================
     Insert registrations after imports

     import ...

     import ...

     registerUseServer(...);
     registerUseServer(...);

     const App = ...
     ========================================================== */

  let insertIndex = 0;

  for (const statement of ast.program.body) {
    if (t.isImportDeclaration(statement)) {
      insertIndex++;
      continue;
    }

    break;
  }

  ast.program.body.splice(insertIndex, 0, ...registrations);

  /* ==========================================================
     Generate
     ========================================================== */

  const output = generate(ast, {
    comments: true,
  });

  return {
    code: output.code,
    map: output.map,
  };
}

/* ============================================================
   Plugin
   ============================================================ */

export default function XanixUseServer(options: Options): Plugin {
  const root = path.resolve(options.root ?? process.cwd());

  return {
    name: "xanix-use-server",

    transform(code: string, id: string) {
      if (!/\.(js|jsx|ts|tsx)$/.test(id)) {
        return null;
      }

      if (id.includes("node_modules")) {
        return null;
      }

      const filename = id.split("?")[0];

      const relativePath = normalizePath(path.relative(root, filename));

      const ast = parse(code, {
        sourceType: "module",

        plugins: ["typescript", "jsx", "importMeta"],
      });

      const useServerName = getUseServerName(ast);

      if (!useServerName) {
        return null;
      }

      if (options.isClient) {
        return transformClient(ast, relativePath, useServerName);
      }

      return transformServer(ast, relativePath, useServerName) as any;
    },
  };
}
