import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import { parse } from "@babel/parser";
import traverse from "@babel/traverse";
import generate from "@babel/generator";
import * as t from "@babel/types";

export interface XanixTransformResult {
  code: string;
  map: any;
}

const RUNTIME_IMPORT = "xanix/runtime";

const SOURCE_EXTENSIONS = [".tsx", ".ts", ".jsx", ".js", ".mjs", ".cjs"];

function normalizeFilePath(file: string): string {
  return path.resolve(file).split(path.sep).join("/");
}

export function resolveFile(file: string): string {
  const absolute = path.resolve(file);

  if (fs.existsSync(absolute)) {
    const stat = fs.statSync(absolute);

    if (stat.isFile()) {
      return absolute;
    }
  }

  for (const ext of SOURCE_EXTENSIONS) {
    const candidate = `${absolute}${ext}`;

    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return path.resolve(candidate);
    }
  }

  if (fs.existsSync(absolute) && fs.statSync(absolute).isDirectory()) {
    for (const ext of SOURCE_EXTENSIONS) {
      const candidate = path.join(absolute, `index${ext}`);

      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        return path.resolve(candidate);
      }
    }
  }

  return absolute;
}

export function resolveComponentFile(
  importer: string,
  importPath: string,
): string {
  if (!importPath.startsWith(".")) {
    return importPath;
  }

  const base = path.resolve(path.dirname(importer), importPath);

  return resolveFile(base);
}

export function createPageId(file: string): string {
  return `c_${crypto
    .createHash("sha256")
    .update(path.normalize(file))
    .digest("hex")
    .slice(0, 12)}`;
}

export function getJSXComponentName(node: t.JSXElement): string | null {
  const name = node.openingElement.name;

  if (t.isJSXIdentifier(name)) {
    return name.name;
  }

  if (t.isJSXMemberExpression(name)) {
    if (t.isJSXIdentifier(name.object) && t.isJSXIdentifier(name.property)) {
      return `${name.object.name}.${name.property.name}`;
    }
  }

  return null;
}

export function findComponentImport(
  ast: t.File,
  componentName: string,
): {
  file: string;
  export: string;
  declaration: t.ImportDeclaration;
  specifier: t.ImportSpecifier | t.ImportDefaultSpecifier;
} | null {
  for (const node of ast.program.body) {
    if (!t.isImportDeclaration(node)) {
      continue;
    }

    for (const specifier of node.specifiers) {
      if (
        t.isImportDefaultSpecifier(specifier) &&
        specifier.local.name === componentName
      ) {
        return {
          file: node.source.value,
          export: "default",
          declaration: node,
          specifier,
        };
      }

      if (
        t.isImportSpecifier(specifier) &&
        specifier.local.name === componentName
      ) {
        const imported = specifier.imported;

        return {
          file: node.source.value,
          export: t.isIdentifier(imported) ? imported.name : imported.value,
          declaration: node,
          specifier,
        };
      }
    }
  }

  return null;
}

/**
 * Remove a specific component from:
 *
 * import Home from "./Home";
 *
 * or:
 *
 * import Home, { foo } from "./Home";
 *
 * or:
 *
 * import { Home, foo } from "./Home";
 */
function removeComponentImport(componentImport: {
  declaration: t.ImportDeclaration;
  specifier: t.ImportSpecifier | t.ImportDefaultSpecifier;
}): void {
  const { declaration, specifier } = componentImport;

  const index = declaration.specifiers.indexOf(specifier);

  if (index !== -1) {
    declaration.specifiers.splice(index, 1);
  }
}

function removeEmptyImportDeclarations(ast: t.File): void {
  ast.program.body = ast.program.body.filter((statement) => {
    if (!t.isImportDeclaration(statement)) {
      return true;
    }

    return statement.specifiers.length > 0;
  });
}

/**
 * Create:
 *
 * const Home =
 *   (await import("./Home")).default;
 *
 * or:
 *
 * const Home =
 *   (await import("./Home")).Home;
 */
function createDynamicComponentImport(
  componentName: string,
  importPath: string,
  exportName: string,
): t.VariableDeclaration {
  const importCall = t.callExpression(t.import(), [
    t.stringLiteral(importPath),
  ]);

  const awaitedImport = t.awaitExpression(importCall);

  const property =
    exportName === "default"
      ? t.identifier("default")
      : t.identifier(exportName);

  const value = t.memberExpression(awaitedImport, property);

  return t.variableDeclaration("const", [
    t.variableDeclarator(t.identifier(componentName), value),
  ]);
}

/**
 * Convert a JSX name into an expression.
 *
 * Example:
 *
 * <Home />
 *
 * becomes:
 *
 * Home
 */
function jsxNameToExpression(
  name: t.JSXElement["openingElement"]["name"],
): t.Expression | null {
  if (t.isJSXIdentifier(name)) {
    return t.identifier(name.name);
  }

  if (t.isJSXMemberExpression(name)) {
    const object = jsxNameToExpressionFromJSXName(name.object);

    const property = jsxNameToExpressionFromJSXName(name.property);

    if (!object || !property) {
      return null;
    }

    return t.memberExpression(object, property);
  }

  return null;
}

function jsxNameToExpressionFromJSXName(
  name: t.JSXIdentifier | t.JSXMemberExpression,
): t.Expression | null {
  if (t.isJSXIdentifier(name)) {
    return t.identifier(name.name);
  }

  if (t.isJSXMemberExpression(name)) {
    const object = jsxNameToExpressionFromJSXName(name.object);

    const property = jsxNameToExpressionFromJSXName(name.property);

    if (!object || !property) {
      return null;
    }

    return t.memberExpression(object, property);
  }

  return null;
}

/**
 * Convert JSX attributes into an object expression.
 *
 * Example:
 *
 * <Home
 *   name="Naxrul"
 *   age={30}
 *   active
 *   {...user}
 * />
 *
 * becomes:
 *
 * {
 *   name: "Naxrul",
 *   age: 30,
 *   active: true,
 *   ...user
 * }
 */
function jsxAttributesToProps(jsx: t.JSXElement): t.ObjectExpression {
  const properties: (t.ObjectProperty | t.SpreadElement)[] = [];

  for (const attribute of jsx.openingElement.attributes) {
    /**
     * Handle:
     *
     * {...props}
     */
    if (t.isJSXSpreadAttribute(attribute)) {
      properties.push(t.spreadElement(attribute.argument as t.Expression));

      continue;
    }

    /**
     * Normal JSX attribute:
     *
     * name="value"
     * name={value}
     * active
     */
    if (!t.isJSXAttribute(attribute)) {
      continue;
    }

    function jsxAttributeNameToExpression(
      name: t.JSXAttribute["name"],
    ): t.Identifier | t.StringLiteral {
      if (t.isJSXIdentifier(name)) {
        return t.identifier(name.name);
      }

      return t.stringLiteral(`${name.namespace.name}:${name.name.name}`);
    }

    const key = jsxAttributeNameToExpression(attribute.name);
    /**
     * Boolean JSX prop:
     *
     * <Home active />
     *
     * becomes:
     *
     * active: true
     */
    if (!attribute.value) {
      properties.push(t.objectProperty(key, t.booleanLiteral(true)));

      continue;
    }

    /**
     * String prop:
     *
     * name="Naxrul"
     *
     * becomes:
     *
     * name: "Naxrul"
     */
    if (t.isStringLiteral(attribute.value)) {
      properties.push(
        t.objectProperty(key, t.stringLiteral(attribute.value.value)),
      );

      continue;
    }

    /**
     * Expression prop:
     *
     * age={30}
     * user={user}
     * items={items.map(...)}
     */
    if (t.isJSXExpressionContainer(attribute.value)) {
      const expression = attribute.value.expression;

      if (t.isJSXEmptyExpression(expression)) {
        continue;
      }

      properties.push(t.objectProperty(key, expression as t.Expression));

      continue;
    }

    /**
     * JSX element as a prop:
     *
     * content={<div>Hello</div>}
     */
    if (t.isJSXElement(attribute.value)) {
      properties.push(t.objectProperty(key, attribute.value));

      continue;
    }
  }

  return t.objectExpression(properties);
}

/**
 * Convert:
 *
 * <Home name="Naxrul" age={30} />
 *
 * into:
 *
 * {
 *   component: Home,
 *   props: {
 *     name: "Naxrul",
 *     age: 30
 *   }
 * }
 */
function jsxToComponentAndProps(jsx: t.JSXElement): {
  component: t.Expression;
  props: t.ObjectExpression;
} | null {
  const component = jsxNameToExpression(jsx.openingElement.name);

  if (!component) {
    return null;
  }

  const props = jsxAttributesToProps(jsx);

  return {
    component,
    props,
  };
}

/**
 * Find:
 *
 * const app = express();
 * const exp = express();
 * const server = express();
 *
 * Returns the variable name.
 */
function findExpressAppVariable(ast: t.File): string | null {
  for (const statement of ast.program.body) {
    if (!t.isVariableDeclaration(statement)) {
      continue;
    }

    for (const declaration of statement.declarations) {
      if (!t.isIdentifier(declaration.id)) {
        continue;
      }

      if (!t.isCallExpression(declaration.init)) {
        continue;
      }

      if (
        !t.isIdentifier(declaration.init.callee, {
          name: "express",
        })
      ) {
        continue;
      }

      return declaration.id.name;
    }
  }

  return null;
}

/**
 * Replace:
 *
 * const app = express();
 *
 * with:
 *
 * const app = createXanixServer({
 *   mode: "watch"
 * });
 */
function transformExpressAppTocreateXanixServer(
  ast: t.File,
  args: {
    mode: "watch" | "start";
  },
): boolean {
  const expressVariable = findExpressAppVariable(ast);

  if (!expressVariable) {
    return false;
  }

  for (const statement of ast.program.body) {
    if (!t.isVariableDeclaration(statement)) {
      continue;
    }

    for (const declaration of statement.declarations) {
      if (!t.isIdentifier(declaration.id)) {
        continue;
      }

      if (declaration.id.name !== expressVariable) {
        continue;
      }

      if (!t.isCallExpression(declaration.init)) {
        continue;
      }

      if (
        !t.isIdentifier(declaration.init.callee, {
          name: "express",
        })
      ) {
        continue;
      }

      declaration.init = t.callExpression(t.identifier("createXanixServer"), [
        t.objectExpression([
          t.objectProperty(t.identifier("mode"), t.stringLiteral(args.mode)),
        ]),
      ]);

      return true;
    }
  }

  return false;
}

/**
 * Remove:
 *
 * import express from "express";
 *
 * once express() has been replaced by
 * createXanixServer().
 *
 * Also handles:
 *
 * import express, { Router } from "express";
 */
function removeExpressImport(ast: t.File): void {
  for (const statement of ast.program.body) {
    if (!t.isImportDeclaration(statement)) {
      continue;
    }

    if (statement.source.value !== "express") {
      continue;
    }

    statement.specifiers = statement.specifiers.filter((specifier) => {
      return !(
        t.isImportDefaultSpecifier(specifier) &&
        specifier.local.name === "express"
      );
    });
  }

  removeEmptyImportDeclarations(ast);
}

function hasRuntimeImport(ast: t.File, name: string): boolean {
  for (const statement of ast.program.body) {
    if (!t.isImportDeclaration(statement)) {
      continue;
    }

    if (statement.source.value !== RUNTIME_IMPORT) {
      continue;
    }

    for (const specifier of statement.specifiers) {
      if (
        t.isImportSpecifier(specifier) &&
        t.isIdentifier(specifier.imported) &&
        specifier.imported.name === name
      ) {
        return true;
      }
    }
  }

  return false;
}

function injectRuntimeImport(ast: t.File, name: string): void {
  if (hasRuntimeImport(ast, name)) {
    return;
  }

  // Find existing:
  // import { ... } from "xanix/runtime";
  for (const statement of ast.program.body) {
    if (!t.isImportDeclaration(statement)) {
      continue;
    }

    if (statement.source.value !== RUNTIME_IMPORT) {
      continue;
    }

    statement.specifiers.push(
      t.importSpecifier(t.identifier(name), t.identifier(name)),
    );

    return;
  }

  // No runtime import exists yet
  ast.program.body.unshift(
    t.importDeclaration(
      [t.importSpecifier(t.identifier(name), t.identifier(name))],
      t.stringLiteral(RUNTIME_IMPORT),
    ),
  );
}

export function transformer(
  code: string,
  id: string,
  mode: "watch" | "start",
): XanixTransformResult | null {
  const ast = parse(code, {
    sourceType: "module",
    plugins: ["typescript", "jsx"],
  });

  let changed = false;

  traverse(ast, {
    CallExpression(callPath) {
      const call = callPath.node;

      /**
       * Find:
       *
       * res.send(<Home />);
       */
      if (!t.isMemberExpression(call.callee)) {
        return;
      }

      if (
        !t.isIdentifier(call.callee.property, {
          name: "send",
        })
      ) {
        return;
      }

      const argument = call.arguments[0];

      if (!argument || !t.isJSXElement(argument)) {
        return;
      }

      const functionPath = callPath.getFunctionParent();

      if (!functionPath) {
        return;
      }

      const params = functionPath.node.params;

      if (params.length < 2) {
        return;
      }

      const requestParam = params[0];
      const responseParam = params[1];

      if (!t.isIdentifier(requestParam) || !t.isIdentifier(responseParam)) {
        return;
      }

      const componentName = getJSXComponentName(argument);

      if (!componentName) {
        return;
      }

      const componentImport = findComponentImport(ast, componentName);

      if (!componentImport) {
        return;
      }

      const componentImportPath = componentImport.file;

      const componentFile = resolveComponentFile(id, componentImportPath);

      if (!path.isAbsolute(componentFile)) {
        return;
      }

      const normalizedFile = normalizeFilePath(componentFile);

      const pageId = createPageId(normalizedFile);

      /**
       * Convert:
       *
       * <Home name="Naxrul" age={30} />
       *
       * into:
       *
       * component: Home
       *
       * props: {
       *   name: "Naxrul",
       *   age: 30
       * }
       */
      const componentAndProps = jsxToComponentAndProps(argument);

      if (!componentAndProps) {
        return;
      }

      /**
       * Remove:
       *
       * import Home from "./Home";
       */
      removeComponentImport(componentImport);

      /**
       * Add:
       *
       * const Home =
       *   (await import("./Home")).default;
       */
      const dynamicImport = createDynamicComponentImport(
        componentName,
        componentImportPath,
        componentImport.export,
      );

      /**
       * Insert immediately before:
       *
       * res.send(<Home />);
       */
      const statementPath = callPath.getStatementParent();

      if (statementPath) {
        statementPath.insertBefore(dynamicImport);
      }

      /**
       * Route becomes:
       *
       * async (req, res) => {}
       */
      if (t.isFunction(functionPath.node)) {
        functionPath.node.async = true;
      }

      /**
       * Replace:
       *
       * res.send(<Home />);
       *
       * with:
       *
       * res.send(
       *   await xanixPage({
       *     clientId,
       *     req,
       *     res,
       *     component: Home,
       *     props: {
       *       ...
       *     }
       *   })
       * );
       */
      const pageCall = t.awaitExpression(
        t.callExpression(t.identifier("xanixPage"), [
          t.objectExpression([
            t.objectProperty(t.identifier("pageId"), t.stringLiteral(pageId)),

            t.objectProperty(
              t.identifier("req"),
              t.identifier(requestParam.name),
            ),

            t.objectProperty(
              t.identifier("res"),
              t.identifier(responseParam.name),
            ),

            t.objectProperty(
              t.identifier("Component"),
              componentAndProps.component,
            ),

            t.objectProperty(t.identifier("props"), componentAndProps.props),
          ]),
        ]),
      );

      call.arguments[0] = pageCall;

      changed = true;
    },
  });

  if (!changed) {
    return null;
  }

  /**
   * Change:
   *
   * const app = express();
   *
   * into:
   *
   * const app = createXanixServer();
   */
  const serverTransformed = transformExpressAppTocreateXanixServer(ast, {
    mode,
  });

  if (serverTransformed) {
    /**
     * Remove:
     *
     * import express from "express";
     */
    removeExpressImport(ast);

    /**
     * Add:
     *
     * import { createXanixServer }
     *   from "xanix/runtime";
     */
    injectRuntimeImport(ast, "createXanixServer");
  }

  /**
   * Add:
   *
   * import xanixPage from "xanix/page";
   */
  injectRuntimeImport(ast, "xanixPage");

  /**
   * Remove empty imports.
   */
  removeEmptyImportDeclarations(ast);

  const output = generate(ast, {}, code);

  return {
    code: output.code,
    map: output.map,
  };
}
