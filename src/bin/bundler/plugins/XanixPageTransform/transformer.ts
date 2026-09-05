import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";

import { parse } from "@babel/parser";
import traverse from "@babel/traverse";
import generate from "@babel/generator";
import * as t from "@babel/types";

export interface XanixPageEntry {
  id: string;
  name: string;
  file: string;
  path: string;
  export: string;
}

export interface XanixTransformResult {
  code: string;
  map: any;
  entries: XanixPageEntry[];
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

function findComponentImport(
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

function removeComponentImport(
  ast: t.File,
  componentImport: {
    declaration: t.ImportDeclaration;
    specifier: t.ImportSpecifier | t.ImportDefaultSpecifier;
  },
): void {
  const { declaration, specifier } = componentImport;

  const index = declaration.specifiers.indexOf(specifier);

  if (index !== -1) {
    declaration.specifiers.splice(index, 1);
  }

  if (declaration.specifiers.length === 0) {
    const bodyIndex = ast.program.body.indexOf(declaration);

    if (bodyIndex !== -1) {
      ast.program.body.splice(bodyIndex, 1);
    }
  }
}

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

function jsxAttributesToProps(jsx: t.JSXElement): t.ObjectExpression {
  const properties: (t.ObjectProperty | t.SpreadElement)[] = [];

  for (const attribute of jsx.openingElement.attributes) {
    if (t.isJSXSpreadAttribute(attribute)) {
      properties.push(t.spreadElement(attribute.argument as t.Expression));

      continue;
    }

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

    if (!attribute.value) {
      properties.push(t.objectProperty(key, t.booleanLiteral(true)));

      continue;
    }

    if (t.isStringLiteral(attribute.value)) {
      properties.push(
        t.objectProperty(key, t.stringLiteral(attribute.value.value)),
      );

      continue;
    }

    if (t.isJSXExpressionContainer(attribute.value)) {
      const expression = attribute.value.expression;

      if (t.isJSXEmptyExpression(expression)) {
        continue;
      }

      properties.push(t.objectProperty(key, expression as t.Expression));

      continue;
    }

    if (t.isJSXElement(attribute.value)) {
      properties.push(t.objectProperty(key, attribute.value));
    }
  }

  return t.objectExpression(properties);
}

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

function createDynamicComponentProperty(importPath: string): t.ObjectProperty {
  const importCall = t.callExpression(t.import(), [
    t.stringLiteral(importPath),
  ]);

  const awaitedImport = t.awaitExpression(importCall);

  const arrowFunction = t.arrowFunctionExpression([], awaitedImport);

  arrowFunction.async = true;

  return t.objectProperty(t.identifier("component"), arrowFunction);
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
): XanixTransformResult | null {
  const ast = parse(code, {
    sourceType: "module",
    plugins: ["typescript", "jsx"],
  });

  let changed = false;

  const entries: XanixPageEntry[] = [];

  traverse(ast, {
    CallExpression(callPath) {
      const call = callPath.node;

      /*
       * Find:
       *
       * res.send(...)
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

      /*
       * Only transform:
       *
       * res.send(<HomePage />)
       */
      if (!argument || !t.isJSXElement(argument)) {
        return;
      }

      /*
       * Find:
       *
       * (req, res) => {}
       */
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

      /*
       * Find component name:
       *
       * <HomePage />
       */
      const componentName = getJSXComponentName(argument);

      if (!componentName) {
        return;
      }

      /*
       * Find:
       *
       * import HomePage from "../pages/Home";
       */
      const componentImport = findComponentImport(ast, componentName);

      if (!componentImport) {
        return;
      }

      const componentImportPath = componentImport.file;

      /*
       * Resolve:
       *
       * ../pages/Home
       *
       * ->
       *
       * C:/xampp/htdocs/xanix/app/pages/Home/index.tsx
       */
      const componentFile = resolveComponentFile(id, componentImportPath);

      if (!path.isAbsolute(componentFile)) {
        return;
      }

      /*
       * Normalize absolute file path.
       */
      const normalizedFile = normalizeFilePath(componentFile);

      /*
       * Stable page ID.
       */
      const pageId = createPageId(normalizedFile);

      /*
       * JSX:
       *
       * <HomePage title="Hello" />
       *
       * ->
       *
       * {
       *   title: "Hello"
       * }
       */
      const componentAndProps = jsxToComponentAndProps(argument);

      if (!componentAndProps) {
        return;
      }

      /*
       * Create manifest entry.
       */
      entries.push({
        id: pageId,
        name: componentName,
        file: normalizedFile,
        path: componentImportPath,
        export: componentImport.export,
      });

      /*
       * Remove static component import.
       */
      removeComponentImport(ast, componentImport);

      /*
       * Create:
       *
       * component: async () =>
       *   await import("../pages/Home")
       */
      const componentProperty =
        createDynamicComponentProperty(componentImportPath);

      /*
       * Make route handler async.
       */
      if (t.isFunction(functionPath.node)) {
        functionPath.node.async = true;
      }

      /*
       * Create:
       *
       * await xanixPage({
       *   component: async () =>
       *     await import("../pages/Home"),
       *   pageId: "...",
       *   req,
       *   res,
       *   props: {}
       * })
       */
      const pageOptions = t.objectExpression([
        componentProperty,

        t.objectProperty(t.identifier("pageId"), t.stringLiteral(pageId)),

        t.objectProperty(t.identifier("req"), t.identifier(requestParam.name)),

        t.objectProperty(t.identifier("res"), t.identifier(responseParam.name)),

        t.objectProperty(t.identifier("props"), componentAndProps.props),
      ]);

      const pageCall = t.awaitExpression(
        t.callExpression(t.identifier("xanixPage"), [pageOptions]),
      );

      /*
       * Replace:
       *
       * res.send(<HomePage />);
       *
       * with:
       *
       * res.send(
       *   await xanixPage({...})
       * );
       */
      call.arguments[0] = pageCall;

      changed = true;
    },
  });

  if (!changed) {
    return null;
  }

  /*
   * Add:
   *
   * import { xanixPage } from "xanix/runtime";
   */
  injectRuntimeImport(ast, "xanixPage");

  /*
   * Generate final code + source map.
   */
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
    entries,
  };
}
