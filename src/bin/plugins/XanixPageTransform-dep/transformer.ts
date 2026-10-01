import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";

export interface XanixPageEntry {
  id: string;
  name: string;
  file: string;
  path: string;
  export: string;
}

export interface XanixTransformResult {
  code: string;
  entries: XanixPageEntry[];
}

const RUNTIME_IMPORT = "xanix/runtime";

const SOURCE_EXTENSIONS = [".tsx", ".ts", ".jsx", ".js", ".mjs", ".cjs"];

type AstNode = {
  type: string;
  start?: number;
  end?: number;
  [key: string]: any;
};

interface TextEdit {
  start: number;
  end: number;
  content: string;
}

export function normalizeFilePath(file: string): string {
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
  return crypto
    .createHash("sha256")
    .update(path.normalize(file))
    .digest("hex")
    .slice(0, 12);
}

/* -------------------------------------------------------------------------- */
/* AST helpers                                                                */
/* -------------------------------------------------------------------------- */

function isNode(value: unknown): value is AstNode {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as any).type === "string"
  );
}

function walk(
  node: AstNode,
  visitor: (
    node: AstNode,
    parent: AstNode | null,
    ancestors: AstNode[],
  ) => void,
  parent: AstNode | null = null,
  ancestors: AstNode[] = [],
): void {
  visitor(node, parent, ancestors);

  const nextAncestors = [...ancestors, node];

  for (const key of Object.keys(node)) {
    if (
      key === "parent" ||
      key === "loc" ||
      key === "range" ||
      key === "tokens" ||
      key === "comments"
    ) {
      continue;
    }

    const value = node[key];

    if (Array.isArray(value)) {
      for (const item of value) {
        if (isNode(item)) {
          walk(item, visitor, node, nextAncestors);
        }
      }

      continue;
    }

    if (isNode(value)) {
      walk(value, visitor, node, nextAncestors);
    }
  }
}

function isFunctionNode(node: AstNode): boolean {
  return (
    node.type === "FunctionDeclaration" ||
    node.type === "FunctionExpression" ||
    node.type === "ArrowFunctionExpression"
  );
}

function findFunctionParent(ancestors: AstNode[]): AstNode | null {
  for (let i = ancestors.length - 1; i >= 0; i--) {
    if (isFunctionNode(ancestors[i])) {
      return ancestors[i];
    }
  }

  return null;
}

function isMemberExpression(node: AstNode | undefined): boolean {
  return (
    !!node &&
    (node.type === "MemberExpression" ||
      node.type === "OptionalMemberExpression")
  );
}

function getMemberPropertyName(node: AstNode): string | null {
  if (!isMemberExpression(node)) {
    return null;
  }

  if (node.computed) {
    const property = node.property;

    if (property?.type === "Literal" && typeof property.value === "string") {
      return property.value;
    }

    return null;
  }

  if (node.property?.type === "Identifier") {
    return node.property.name;
  }

  return null;
}

function getJSXComponentName(jsx: AstNode): string | null {
  const name = jsx.openingElement?.name;

  if (!name) {
    return null;
  }

  if (name.type === "JSXIdentifier") {
    return name.name;
  }

  if (name.type === "JSXMemberExpression") {
    const parts: string[] = [];

    let current: AstNode | undefined = name;

    while (current) {
      if (current.type === "JSXIdentifier") {
        parts.unshift(current.name);
        break;
      }

      if (current.type === "JSXMemberExpression") {
        if (current.property?.type === "JSXIdentifier") {
          parts.unshift(current.property.name);
        }

        current = current.object;
        continue;
      }

      break;
    }

    return parts.length ? parts.join(".") : null;
  }

  return null;
}

/* -------------------------------------------------------------------------- */
/* Import helpers                                                             */
/* -------------------------------------------------------------------------- */

interface ComponentImport {
  source: string;
  exportName: string;
  declaration: AstNode;
  specifier: AstNode;
}

function getImportedName(specifier: AstNode): string | null {
  if (specifier.type === "ImportDefaultSpecifier") {
    return "default";
  }

  if (specifier.type === "ImportSpecifier") {
    const imported = specifier.imported;

    if (imported?.type === "Identifier") {
      return imported.name;
    }

    if (imported?.type === "Literal") {
      return String(imported.value);
    }
  }

  return null;
}

// function findComponentImport(
//   ast: AstNode,
//   componentName: string,
// ): ComponentImport | null {
//   const body = ast.body ?? [];

//   for (const statement of body) {
//     if (statement.type !== "ImportDeclaration") {
//       continue;
//     }

//     const source = statement.source?.value;

//     if (typeof source !== "string") {
//       continue;
//     }

//     for (const specifier of statement.specifiers ?? []) {
//       if (!specifier.local || specifier.local.name !== componentName) {
//         continue;
//       }

//       const exportName = getImportedName(specifier);

//       if (!exportName) {
//         continue;
//       }

//       return {
//         source,
//         exportName,
//         declaration: statement,
//         specifier,
//       };
//     }
//   }

//   return null;
// }

/* -------------------------------------------------------------------------- */
/* JSX -> props                                                               */
/* -------------------------------------------------------------------------- */

function sourceSlice(code: string, node: AstNode): string {
  return code.slice(node.start!, node.end!);
}

// function jsxNameToExpression(name: AstNode): string | null {
//   if (name.type === "JSXIdentifier") {
//     return name.name;
//   }

//   if (name.type === "JSXMemberExpression") {
//     const object = jsxNameToExpression(name.object);

//     const property = jsxNameToExpression(name.property);

//     if (!object || !property) {
//       return null;
//     }

//     return `${object}.${property}`;
//   }

//   return null;
// }

function jsxAttributeKey(attribute: AstNode): string {
  const name = attribute.name;

  if (name?.type === "JSXIdentifier") {
    return name.name;
  }

  if (name?.type === "JSXNamespacedName") {
    const namespace = name.namespace?.name ?? "";

    const local = name.name?.name ?? "";

    return `${namespace}:${local}`;
  }

  return "";
}

function jsxAttributeValue(attribute: AstNode, code: string): string {
  const value = attribute.value;

  if (!value) {
    return "true";
  }

  if (value.type === "Literal") {
    return JSON.stringify(String(value.value ?? ""));
  }

  if (value.type === "JSXExpressionContainer") {
    const expression = value.expression;

    if (!expression || expression.type === "JSXEmptyExpression") {
      return "undefined";
    }

    return sourceSlice(code, expression);
  }

  if (value.type === "JSXElement" || value.type === "JSXFragment") {
    return sourceSlice(code, value);
  }

  return sourceSlice(code, value);
}

function jsxAttributesToProps(jsx: AstNode, code: string): string {
  const properties: string[] = [];

  const attributes = jsx.openingElement?.attributes ?? [];

  for (const attribute of attributes) {
    if (attribute.type === "JSXSpreadAttribute") {
      const argument = attribute.argument;

      if (!argument) {
        continue;
      }

      properties.push(`...${sourceSlice(code, argument)}`);

      continue;
    }

    if (attribute.type !== "JSXAttribute") {
      continue;
    }

    const key = jsxAttributeKey(attribute);

    if (!key) {
      continue;
    }

    const value = jsxAttributeValue(attribute, code);

    const validIdentifier = /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key);

    const propertyKey = validIdentifier ? key : JSON.stringify(key);

    properties.push(`${propertyKey}: ${value}`);
  }

  return `{ ${properties.join(", ")} }`;
}

/* -------------------------------------------------------------------------- */
/* Import editing                                                             */
/* -------------------------------------------------------------------------- */

function createImportRemovalEdit(
  declaration: AstNode,
  specifier: AstNode,
  code: string,
): TextEdit | null {
  const specifiers = declaration.specifiers ?? [];

  if (specifier.start == null || specifier.end == null) {
    return null;
  }

  if (specifiers.length === 1) {
    return {
      start: declaration.start!,
      end: declaration.end!,
      content: "",
    };
  }

  const index = specifiers.indexOf(specifier);

  if (index === -1) {
    return null;
  }

  /*
   * import Foo, { Bar } from "x"
   *          ^^^^^^^^^
   *
   * import { Foo, Bar } from "x"
   *          ^^^
   */

  if (index === 0) {
    const next = specifiers[index + 1];

    if (next?.start != null) {
      return {
        start: specifier.start,
        end: next.start,
        content: "",
      };
    }
  }

  const previous = specifiers[index - 1];

  if (previous?.end != null) {
    return {
      start: previous.end,
      end: specifier.end,
      content: "",
    };
  }

  return null;
}

function hasRuntimeImport(ast: AstNode, name: string): boolean {
  for (const statement of ast.body ?? []) {
    if (statement.type !== "ImportDeclaration") {
      continue;
    }

    if (statement.source?.value !== RUNTIME_IMPORT) {
      continue;
    }

    for (const specifier of statement.specifiers ?? []) {
      if (
        specifier.type === "ImportSpecifier" &&
        specifier.imported?.type === "Identifier" &&
        specifier.imported.name === name
      ) {
        return true;
      }
    }
  }

  return false;
}

function createRuntimeImportEdit(ast: AstNode, name: string): TextEdit {
  if (hasRuntimeImport(ast, name)) {
    return {
      start: 0,
      end: 0,
      content: "",
    };
  }

  /*
   * Keep this simple and let Rolldown/Oxc
   * process the import normally afterward.
   */
  return {
    start: 0,
    end: 0,
    content: `import { ${name} } from "${RUNTIME_IMPORT}";\n`,
  };
}

/* -------------------------------------------------------------------------- */
/* Function async                                                             */
/* -------------------------------------------------------------------------- */

function createAsyncEdit(functionNode: AstNode, code: string): TextEdit | null {
  if (functionNode.async) {
    return null;
  }

  if (functionNode.start == null) {
    return null;
  }

  /*
   * Arrow:
   *
   * (req, res) => ...
   *
   * becomes:
   *
   * async (req, res) => ...
   *
   */

  if (functionNode.type === "ArrowFunctionExpression") {
    return {
      start: functionNode.start,
      end: functionNode.start,
      content: "async ",
    };
  }

  /*
   * Function:
   *
   * function handler(...)
   *
   * becomes:
   *
   * async function handler(...)
   */

  if (
    functionNode.type === "FunctionDeclaration" ||
    functionNode.type === "FunctionExpression"
  ) {
    return {
      start: functionNode.start,
      end: functionNode.start,
      content: "async ",
    };
  }

  return null;
}

/* -------------------------------------------------------------------------- */
/* Main transformer                                                           */
/* -------------------------------------------------------------------------- */

export function transformer(
  code: string,
  id: string,
  ast: AstNode,
): XanixTransformResult | null {
  const edits: TextEdit[] = [];
  const entries: XanixPageEntry[] = [];

  const componentImports = new Map<string, ComponentImport>();

  /*
   * Cache all imports first.
   */
  for (const statement of ast.body ?? []) {
    if (statement.type !== "ImportDeclaration") {
      continue;
    }

    const source = statement.source?.value;

    if (typeof source !== "string") {
      continue;
    }

    for (const specifier of statement.specifiers ?? []) {
      const localName = specifier.local?.name;

      if (!localName) {
        continue;
      }

      const exportName = getImportedName(specifier);

      if (!exportName) {
        continue;
      }

      componentImports.set(localName, {
        source,
        exportName,
        declaration: statement,
        specifier,
      });
    }
  }

  const removedImportDeclarations = new Set<AstNode>();

  const transformedCalls = new Set<AstNode>();

  walk(ast, (node, _parent, ancestors) => {
    if (node.type !== "CallExpression") {
      return;
    }

    if (transformedCalls.has(node)) {
      return;
    }

    const callee = node.callee;

    if (!isMemberExpression(callee)) {
      return;
    }

    const method = getMemberPropertyName(callee);

    if (method !== "send") {
      return;
    }

    const argument = node.arguments?.[0];

    if (!argument || argument.type !== "JSXElement") {
      return;
    }

    const functionNode = findFunctionParent(ancestors);

    if (!functionNode) {
      return;
    }

    const params = functionNode.params ?? [];

    if (params.length < 2) {
      return;
    }

    const requestParam = params[0];

    const responseParam = params[1];

    if (requestParam?.type !== "Identifier") {
      return;
    }

    if (responseParam?.type !== "Identifier") {
      return;
    }

    const componentName = getJSXComponentName(argument);

    if (!componentName) {
      return;
    }

    /*
     * For:
     *
     * <Foo />
     *
     * componentName = Foo
     *
     * For:
     *
     * <UI.Page />
     *
     * this only works when the import is
     * represented by the same local identifier.
     */
    const componentImport = componentImports.get(componentName);

    if (!componentImport) {
      return;
    }

    const componentImportPath = componentImport.source;

    const componentFile = resolveComponentFile(id, componentImportPath);

    /*
     * Only local component files become
     * Xanix pages.
     */
    if (!path.isAbsolute(componentFile)) {
      return;
    }

    const normalizedFile = normalizeFilePath(componentFile);

    const pageId = createPageId(normalizedFile);

    const props = jsxAttributesToProps(argument, code);

    entries.push({
      id: pageId,
      name: componentName,
      file: normalizedFile,
      path: componentImportPath,
      export: componentImport.exportName,
    });

    /*
     * Remove the server-side component import.
     */
    if (!removedImportDeclarations.has(componentImport.declaration)) {
      const importEdit = createImportRemovalEdit(
        componentImport.declaration,
        componentImport.specifier,
        code,
      );

      if (importEdit) {
        edits.push(importEdit);
      }

      removedImportDeclarations.add(componentImport.declaration);
    }

    /*
     * Make the containing handler async.
     */
    const asyncEdit = createAsyncEdit(functionNode, code);

    if (asyncEdit) {
      edits.push(asyncEdit);
    }

    /*
     * Preserve the same runtime contract
     * used by the old Babel implementation:
     *
     * await xanixPage({
     *   component: async () => (
     *     await import("./Home")
     *   ),
     *   pageId,
     *   req,
     *   res,
     *   props
     * })
     */
    const pageCall = [
      "await xanixPage({",
      `component: async () => (await import(${JSON.stringify(componentImportPath)})),`,
      `pageId: ${JSON.stringify(pageId)},`,
      `req: ${requestParam.name},`,
      `res: ${responseParam.name},`,
      `props: ${props},`,
      "})",
    ].join("\n");

    edits.push({
      start: argument.start!,
      end: argument.end!,
      content: pageCall,
    });

    transformedCalls.add(node);
  });

  if (!entries.length) {
    return null;
  }

  /*
   * Inject xanixPage import.
   */
  const runtimeImport = createRuntimeImportEdit(ast, "xanixPage");

  if (runtimeImport.content) {
    edits.push(runtimeImport);
  }

  /*
   * Apply edits backwards so offsets
   * remain valid.
   */
  edits.sort((a, b) => b.start - a.start);

  let transformedCode = code;

  let lastStart = Number.POSITIVE_INFINITY;

  for (const edit of edits) {
    /*
     * Ignore overlapping edits.
     */
    if (edit.end > lastStart) {
      continue;
    }

    transformedCode =
      transformedCode.slice(0, edit.start) +
      edit.content +
      transformedCode.slice(edit.end);

    lastStart = edit.start;
  }

  return {
    code: transformedCode,
    entries,
  };
}
