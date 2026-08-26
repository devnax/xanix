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

const SERVER_IMPORT = "xanix/server";
const PAGE_IMPORT = "xanix/page";

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

export function createClientId(file: string): string {
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
 * const app = createXanixServer();
 */
function transformExpressAppTocreateXanixServer(
  ast: t.File,
  args: { mode: "watch" | "start" },
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
      // Replace express() with createXanixServer({ mode: "watch" | "start" })
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

/**
 * Check whether createXanixServer is already
 * imported from xanix/server.
 */
function hascreateXanixServerImport(ast: t.File): boolean {
  for (const statement of ast.program.body) {
    if (!t.isImportDeclaration(statement)) {
      continue;
    }

    if (statement.source.value !== SERVER_IMPORT) {
      continue;
    }

    for (const specifier of statement.specifiers) {
      if (
        t.isImportSpecifier(specifier) &&
        t.isIdentifier(specifier.imported) &&
        specifier.imported.name === "createXanixServer"
      ) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Add:
 *
 * import { createXanixServer } from "xanix/server";
 */
function injectcreateXanixServerImport(ast: t.File): void {
  if (hascreateXanixServerImport(ast)) {
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
      t.stringLiteral(SERVER_IMPORT),
    ),
  );
}

/**
 * Check whether xanix/page is already
 * imported.
 */
function hasPageImport(ast: t.File): boolean {
  for (const statement of ast.program.body) {
    if (!t.isImportDeclaration(statement)) {
      continue;
    }

    if (statement.source.value !== PAGE_IMPORT) {
      continue;
    }

    for (const specifier of statement.specifiers) {
      if (
        t.isImportDefaultSpecifier(specifier) &&
        specifier.local.name === "xanixPage"
      ) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Add:
 *
 * import xanixPage from "xanix/page";
 */
function injectPageImport(ast: t.File): void {
  if (hasPageImport(ast)) {
    return;
  }

  ast.program.body.unshift(
    t.importDeclaration(
      [t.importDefaultSpecifier(t.identifier("xanixPage"))],
      t.stringLiteral(PAGE_IMPORT),
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
      const clientId = createClientId(normalizedFile);

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
       *     component: <Home />
       *   })
       * );
       */
      const pageCall = t.awaitExpression(
        t.callExpression(t.identifier("xanixPage"), [
          t.objectExpression([
            t.objectProperty(
              t.identifier("clientId"),
              t.stringLiteral(clientId),
            ),

            t.objectProperty(
              t.identifier("req"),
              t.identifier(requestParam.name),
            ),

            t.objectProperty(
              t.identifier("res"),
              t.identifier(responseParam.name),
            ),

            t.objectProperty(t.identifier("component"), argument),
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
     *   from "xanix/server";
     */
    injectcreateXanixServerImport(ast);
  }

  /**
   * Add:
   *
   * import xanixPage from "xanix/page";
   */
  injectPageImport(ast);

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
