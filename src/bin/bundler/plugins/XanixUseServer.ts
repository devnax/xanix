import type { Plugin } from "rollup";

import type { NodePath } from "@babel/traverse";

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

type Component = {
  name: string;
  declaration: t.FunctionDeclaration | t.VariableDeclaration;
  functionNode:
    | t.FunctionDeclaration
    | t.ArrowFunctionExpression
    | t.FunctionExpression;
};

const normalizePath = (value: string): string => value.replace(/\\/g, "/");

const createUID = (file: string, index: number): string =>
  `${crypto
    .createHash("sha256")
    .update(`${file}:${index}`)
    .digest("hex")
    .slice(0, 16)}`;

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
   Detect useServer(...)
   ============================================================ */

const isUseServer = (node: t.CallExpression, localName: string): boolean =>
  t.isIdentifier(node.callee) && node.callee.name === localName;

/* ============================================================
   Plugin
   ============================================================ */

export default function XanixUseServer(options: Options): Plugin {
  const root = path.resolve(options.root ?? process.cwd());

  return {
    name: "xanix-use-server",

    transform(code: string, id: string) {
      if (!/\.(js|jsx|ts|tsx)$/.test(id) || id.includes("node_modules")) {
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
function createClientProps(
  props: t.Expression | undefined,
  uid: string,
): t.ObjectExpression {
  if (!props) {
    return t.objectExpression([
      t.objectProperty(t.identifier("uid"), t.stringLiteral(uid)),
    ]);
  }

  if (t.isObjectExpression(props)) {
    const properties: Array<
      t.ObjectProperty | t.ObjectMethod | t.SpreadElement
    > = [];

    for (const property of props.properties) {
      properties.push(t.cloneNode(property, true));
    }

    properties.push(
      t.objectProperty(t.identifier("uid"), t.stringLiteral(uid)),
    );

    return t.objectExpression(properties);
  }

  return t.objectExpression([
    t.spreadElement(t.cloneNode(props, true)),
    t.objectProperty(t.identifier("uid"), t.stringLiteral(uid)),
  ]);
}

/* ============================================================
   CLIENT
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

      const clientProps = createClientProps(props, uid);

      node.arguments = [clientProps];

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
    const exists = xanixImport.specifiers.some(
      (specifier) =>
        t.isImportSpecifier(specifier) &&
        ((t.isIdentifier(specifier.imported) &&
          specifier.imported.name === "registerUseServer") ||
          (t.isStringLiteral(specifier.imported) &&
            specifier.imported.value === "registerUseServer")),
    );

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

      /*
       * --------------------------------------------------------
       * Register the server callback
       *
       * registerUseServer(
       *   "useServer_xxx",
       *   async ({ category }) => {
       *     ...
       *   }
       * );
       * --------------------------------------------------------
       */

      registrations.push(
        t.expressionStatement(
          t.callExpression(t.identifier("registerUseServer"), [
            t.stringLiteral(uid),
            t.cloneNode(callback, true),
          ]),
        ),
      );

      /*
       * --------------------------------------------------------
       * Component-side useServer
       *
       * useServer(callback, { category })
       *
       * becomes:
       *
       * await useServer({
       *   category,
       *   uid: "useServer_xxx"
       * })
       * --------------------------------------------------------
       */

      const clientArgs = createClientProps(props, uid);

      const call = t.callExpression(t.identifier(useServerName), [clientArgs]);

      const awaited = t.awaitExpression(call);

      callPath.replaceWith(awaited);

      callPath.skip();

      changed = true;
    },
  });

  if (!changed) {
    return null;
  }

  /*
   * ----------------------------------------------------------
   * Find components containing:
   *
   * await useServer(...)
   * ----------------------------------------------------------
   */

  const components: Component[] = [];

  traverse(ast, {
    FunctionDeclaration(functionPath) {
      if (!containsAwaitUseServer(functionPath, useServerName)) {
        return;
      }

      const name = functionPath.node.id?.name;

      if (!name) {
        return;
      }

      if (!functionPath.parentPath.isProgram()) {
        return;
      }

      components.push({
        name,
        declaration: functionPath.node,
        functionNode: functionPath.node,
      });
    },

    VariableDeclarator(variablePath) {
      if (!t.isIdentifier(variablePath.node.id)) {
        return;
      }

      const fn = variablePath.node.init;

      if (!t.isArrowFunctionExpression(fn) && !t.isFunctionExpression(fn)) {
        return;
      }

      if (!containsAwaitUseServer(variablePath, useServerName)) {
        return;
      }

      const declaration = variablePath.parentPath;

      if (!declaration.isVariableDeclaration()) {
        return;
      }

      if (!declaration.parentPath.isProgram()) {
        return;
      }

      components.push({
        name: variablePath.node.id.name,
        declaration: declaration.node,
        functionNode: fn,
      });
    },
  });

  const usedNames = collectTopLevelNames(ast);

  for (const component of components) {
    splitComponent(ast, component, usedNames, useServerName);
  }

  /*
   * ----------------------------------------------------------
   * Add registerUseServer import
   * ----------------------------------------------------------
   */

  addRegisterUseServerImport(ast);

  /*
   * ----------------------------------------------------------
   * Add all registrations at the top level.
   *
   * They must NOT be inside AppDynamicName.
   * ----------------------------------------------------------
   */

  let insertIndex = 0;

  for (const statement of ast.program.body) {
    if (t.isImportDeclaration(statement)) {
      insertIndex++;
      continue;
    }

    break;
  }

  ast.program.body.splice(insertIndex, 0, ...registrations);

  addSuspenseImport(ast);

  const output = generate(ast, {
    comments: true,
  });

  return {
    code: output.code,
    map: output.map,
  };
}
/* ============================================================
   Detect:

   await useServer(...)
   ============================================================ */

function containsAwaitUseServer<T extends t.Node>(
  parentPath: NodePath<T>,
  useServerName: string,
): boolean {
  let found = false;

  parentPath.traverse({
    AwaitExpression(awaitPath) {
      const argument = awaitPath.node.argument;

      if (
        t.isCallExpression(argument) &&
        isUseServer(argument, useServerName)
      ) {
        found = true;
        awaitPath.stop();
      }
    },
  });

  return found;
}

/* ============================================================
   Check whether a statement contains:

   await useServer(...)
   ============================================================ */

function statementContainsUseServer(
  statement: t.Statement,
  useServerName: string,
): boolean {
  let found = false;

  const file = t.file(t.program([t.cloneNode(statement, true)]));

  traverse(file, {
    AwaitExpression(awaitPath) {
      const argument = awaitPath.node.argument;

      if (
        t.isCallExpression(argument) &&
        isUseServer(argument, useServerName)
      ) {
        found = true;
        awaitPath.stop();
      }
    },
  });

  return found;
}

/* ============================================================
   Collect top-level names
   ============================================================ */

function collectTopLevelNames(ast: t.File): Set<string> {
  const names = new Set<string>();

  for (const statement of ast.program.body) {
    if (t.isFunctionDeclaration(statement) && statement.id) {
      names.add(statement.id.name);

      continue;
    }

    if (t.isClassDeclaration(statement) && statement.id) {
      names.add(statement.id.name);

      continue;
    }

    if (t.isVariableDeclaration(statement)) {
      for (const declaration of statement.declarations) {
        if (t.isIdentifier(declaration.id)) {
          names.add(declaration.id.name);
        }
      }

      continue;
    }

    if (t.isImportDeclaration(statement)) {
      for (const specifier of statement.specifiers) {
        names.add(specifier.local.name);
      }
    }
  }

  return names;
}

/* ============================================================
   Dynamic component name

   App
   ->
   AppDynamicName

   collision:

   AppDynamicName
   AppDynamicName_1
   AppDynamicName_2
   ============================================================ */

function createDynamicName(
  componentName: string,
  usedNames: Set<string>,
): string {
  const base = `${componentName}DynamicName`;

  if (!usedNames.has(base)) {
    usedNames.add(base);
    return base;
  }

  let index = 1;

  while (usedNames.has(`${base}_${index}`)) {
    index++;
  }

  const name = `${base}_${index}`;

  usedNames.add(name);

  return name;
}

/* ============================================================
   Inner component name

   Local to the dynamic component,
   so "Comp" is safe here.
   ============================================================ */

function createInnerComponentName(): string {
  return "Comp";
}

/* ============================================================
   Create props for inner Comp

   ({ category })

   ->

   category={category}

   (props)

   ->

   {...props}

   ({ category, name })

   ->

   category={category}
   name={name}
   ============================================================ */

function createComponentProps(
  param: t.FunctionDeclaration["params"][number] | undefined,
): Array<t.JSXAttribute | t.JSXSpreadAttribute> {
  if (!param) {
    return [];
  }

  if (t.isIdentifier(param)) {
    return [t.jsxSpreadAttribute(t.identifier(param.name))];
  }

  if (t.isAssignmentPattern(param)) {
    return createComponentProps((param as any).left);
  }

  if (t.isRestElement(param)) {
    if (t.isIdentifier(param.argument)) {
      return [t.jsxSpreadAttribute(t.identifier(param.argument.name))];
    }

    return [];
  }

  if (!t.isObjectPattern(param)) {
    return [];
  }

  const result: Array<t.JSXAttribute | t.JSXSpreadAttribute> = [];

  for (const property of param.properties) {
    if (t.isRestElement(property)) {
      if (t.isIdentifier(property.argument)) {
        result.push(t.jsxSpreadAttribute(t.identifier(property.argument.name)));
      }

      continue;
    }

    if (!t.isObjectProperty(property)) {
      continue;
    }

    if (property.computed) {
      continue;
    }

    /*
     * { category }
     */

    if (t.isIdentifier(property.key) && t.isIdentifier(property.value)) {
      result.push(
        t.jsxAttribute(
          t.jsxIdentifier(property.key.name),
          t.jsxExpressionContainer(t.identifier(property.value.name)),
        ),
      );

      continue;
    }

    /*
     * { category: cat }
     */

    if (t.isIdentifier(property.key) && t.isExpression(property.value)) {
      result.push(
        t.jsxAttribute(
          t.jsxIdentifier(property.key.name),
          t.jsxExpressionContainer(t.cloneNode(property.value, true)),
        ),
      );
    }
  }

  return result;
}

/* ============================================================
   Create inner Comp

   Original:

   const App = ({ name, category }) => {
     const [count, setCount] =
       React.useState(0);

     const d = await useServer(...);

     const d1 = await useServer(...);

     return <div>Hello {name}</div>;
   };

   New:

   const Comp = ({ name, category }) => {
     const [count, setCount] =
       React.useState(0);

     return <div>Hello {name}</div>;
   };
   ============================================================ */

function createInnerComponent(
  original:
    | t.FunctionDeclaration
    | t.ArrowFunctionExpression
    | t.FunctionExpression,
  innerName: string,
  normalStatements: t.Statement[],
): t.VariableDeclaration {
  const params = original.params.map((param) => t.cloneNode(param, true));

  const body = t.blockStatement(
    normalStatements.map((statement) => t.cloneNode(statement, true)),
  );

  const inner: any = t.arrowFunctionExpression(params, body);

  inner.id = null;

  return t.variableDeclaration("const", [
    t.variableDeclarator(t.identifier(innerName), inner),
  ]);
}

/* ============================================================
   Create:

   return <Comp
     name={name}
     category={category}
   />;

   ============================================================ */

function createDynamicReturn(
  innerName: string,
  originalParam: t.FunctionDeclaration["params"][number] | undefined,
): t.ReturnStatement {
  const props = createComponentProps(originalParam);

  const comp = t.jsxElement(
    t.jsxOpeningElement(t.jsxIdentifier(innerName), props, true),
    null,
    [],
  );

  return t.returnStatement(comp);
}

/* ============================================================
   Split component

   NEW ARCHITECTURE:

   const App = ({ name, category }) => {
     const [count, setCount] =
       React.useState(0);

     const d = useServer(...);

     const d1 = useServer(...);

     return <div>Hello {name}</div>;
   };

   becomes:

   const AppDynamicName = async ({
     name,
     category
   }) => {

     const d = await useServer(...);

     const d1 = await useServer(...);

     const Comp = ({
       name,
       category
     }) => {

       const [count, setCount] =
         React.useState(0);

       return <div>Hello {name}</div>;
     };

     return (
       <Comp
         name={name}
         category={category}
       />
     );
   };

   const App = () => {
     return (
       <Suspense
         fallback={<div>Loading...</div>}
       >
         <AppDynamicName />
       </Suspense>
     );
   };
   ============================================================ */

function splitComponent(
  ast: t.File,
  component: Component,
  usedNames: Set<string>,
  useServerName: string,
): void {
  const dynamicName = createDynamicName(component.name, usedNames);

  const innerName = createInnerComponentName();

  /* ==========================================================
     FUNCTION DECLARATION
     ========================================================== */

  if (t.isFunctionDeclaration(component.functionNode)) {
    const original = component.functionNode;

    const originalParam = original.params[0];

    const originalBody = original.body;

    if (!t.isBlockStatement(originalBody)) {
      return;
    }

    const serverStatements: t.Statement[] = [];
    const normalStatements: t.Statement[] = [];

    for (const statement of originalBody.body) {
      if (statementContainsUseServer(statement, useServerName)) {
        serverStatements.push(statement);
      } else {
        normalStatements.push(statement);
      }
    }

    const dynamic = t.cloneNode(original, true) as t.FunctionDeclaration;

    dynamic.id = t.identifier(dynamicName);

    dynamic.async = true;

    dynamic.body = t.blockStatement([
      ...serverStatements.map((statement) => t.cloneNode(statement, true)),

      createInnerComponent(original, innerName, normalStatements),

      createDynamicReturn(innerName, originalParam),
    ]);

    /*
     * Original App becomes:

     * function App() {
     *   return (
     *     <Suspense>
     *       <AppDynamicName />
     *     </Suspense>
     *   );
     * }
     */

    original.params = [];
    original.async = false;
    original.body = createSuspenseBody(dynamicName);

    const index = ast.program.body.indexOf(component.declaration);

    if (index !== -1) {
      ast.program.body.splice(index, 0, dynamic);
    }

    return;
  }

  /* ==========================================================
     ARROW / FUNCTION EXPRESSION
     ========================================================== */

  const original = component.functionNode;

  if (!t.isBlockStatement(original.body)) {
    return;
  }

  const originalParam = original.params[0];

  const serverStatements: t.Statement[] = [];
  const normalStatements: t.Statement[] = [];

  for (const statement of original.body.body) {
    if (statementContainsUseServer(statement, useServerName)) {
      serverStatements.push(statement);
    } else {
      normalStatements.push(statement);
    }
  }

  const dynamic = t.cloneNode(original, true) as
    | t.ArrowFunctionExpression
    | t.FunctionExpression;

  dynamic.async = true;

  dynamic.params = original.params.map((param) => t.cloneNode(param, true));

  dynamic.body = t.blockStatement([
    ...serverStatements.map((statement) => t.cloneNode(statement, true)),

    createInnerComponent(original, innerName, normalStatements),

    createDynamicReturn(innerName, originalParam),
  ]);

  /*
   * Dynamic declaration:

   * const AppDynamicName =
   *   async ({ name, category }) => {
   *     ...
   *   };
   */

  const dynamicDeclaration = t.variableDeclaration("const", [
    t.variableDeclarator(t.identifier(dynamicName), dynamic),
  ]);

  /*
   * Original App becomes:

   * const App = () => {
   *   return (
   *     <Suspense>
   *       <AppDynamicName />
   *     </Suspense>
   *   );
   * };
   */

  if (t.isArrowFunctionExpression(original)) {
    original.params = [];
    original.async = false;

    original.body = createSuspenseBody(dynamicName);
  } else {
    original.params = [];
    original.async = false;

    original.body = createSuspenseBody(dynamicName);
  }

  const index = ast.program.body.indexOf(component.declaration);

  if (index !== -1) {
    ast.program.body.splice(index, 0, dynamicDeclaration);
  }
}

/* ============================================================
   Suspense body

   IMPORTANT:

   The outer App receives NO props.

   Therefore:

   <AppDynamicName />

   NOT:

   <AppDynamicName {...props} />

   ============================================================ */

function createSuspenseBody(dynamicName: string): t.BlockStatement {
  const dynamic = t.jsxElement(
    t.jsxOpeningElement(t.jsxIdentifier(dynamicName), [], true),
    null,
    [],
  );

  const fallback = t.jsxElement(
    t.jsxOpeningElement(t.jsxIdentifier("div"), [], false),
    t.jsxClosingElement(t.jsxIdentifier("div")),
    [t.jsxText("Loading...")],
  );

  const suspense = t.jsxElement(
    t.jsxOpeningElement(
      t.jsxIdentifier("Suspense"),
      [
        t.jsxAttribute(
          t.jsxIdentifier("fallback"),
          t.jsxExpressionContainer(fallback),
        ),
      ],
      false,
    ),
    t.jsxClosingElement(t.jsxIdentifier("Suspense")),
    [dynamic],
  );

  return t.blockStatement([t.returnStatement(suspense)]);
}

/* ============================================================
   Suspense import

   Existing:

   import React, {
     useState
   } from "react";

   becomes:

   import React, {
     useState,
     Suspense
   } from "react";

   ============================================================ */

function addSuspenseImport(ast: t.File): void {
  let reactImport: t.ImportDeclaration | undefined;

  for (const statement of ast.program.body) {
    if (
      t.isImportDeclaration(statement) &&
      statement.source.value === "react"
    ) {
      reactImport = statement;
      break;
    }
  }

  if (reactImport) {
    const exists = reactImport.specifiers.some(
      (specifier) =>
        t.isImportSpecifier(specifier) &&
        (t.isIdentifier(specifier.imported)
          ? specifier.imported.name === "Suspense"
          : t.isStringLiteral(specifier.imported) &&
            specifier.imported.value === "Suspense"),
    );

    if (!exists) {
      reactImport.specifiers.push(
        t.importSpecifier(t.identifier("Suspense"), t.identifier("Suspense")),
      );
    }

    return;
  }

  ast.program.body.unshift(
    t.importDeclaration(
      [t.importSpecifier(t.identifier("Suspense"), t.identifier("Suspense"))],
      t.stringLiteral("react"),
    ),
  );
}
