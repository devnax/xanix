import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";

import { parseSync } from "oxc-parser";
import { walk } from "oxc-walker";

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

function normalizeFilePath(file: string) {
  return path.resolve(file).split(path.sep).join("/");
}

export function resolveFile(file: string) {
  const absolute = path.resolve(file);

  if (fs.existsSync(absolute) && fs.statSync(absolute).isFile()) {
    return absolute;
  }

  for (const ext of SOURCE_EXTENSIONS) {
    const file = `${absolute}${ext}`;

    if (fs.existsSync(file) && fs.statSync(file).isFile()) {
      return path.resolve(file);
    }
  }

  if (fs.existsSync(absolute) && fs.statSync(absolute).isDirectory()) {
    for (const ext of SOURCE_EXTENSIONS) {
      const file = path.join(absolute, `index${ext}`);

      if (fs.existsSync(file) && fs.statSync(file).isFile()) {
        return path.resolve(file);
      }
    }
  }

  return absolute;
}

export function resolveComponentFile(importer: string, importPath: string) {
  if (!importPath.startsWith(".")) return importPath;

  return resolveFile(path.resolve(path.dirname(importer), importPath));
}

export function createPageId(file: string) {
  return crypto
    .createHash("sha256")
    .update(path.normalize(file))
    .digest("hex")
    .slice(0, 12);
}

function jsxName(node: any): string | null {
  if (node.type === "JSXIdentifier") return node.name;

  if (node.type === "JSXMemberExpression") {
    const object = jsxName(node.object);
    const property = jsxName(node.property);

    return object && property ? `${object}.${property}` : null;
  }

  return null;
}

function findComponentImport(ast: any, name: string) {
  for (const node of ast.body) {
    if (node.type !== "ImportDeclaration") continue;

    for (const specifier of node.specifiers) {
      if (
        specifier.type === "ImportDefaultSpecifier" &&
        specifier.local.name === name
      ) {
        return {
          file: node.source.value,
          export: "default",
          declaration: node,
          specifier,
        };
      }

      if (
        specifier.type === "ImportSpecifier" &&
        specifier.local.name === name
      ) {
        return {
          file: node.source.value,
          export:
            specifier.imported.type === "Identifier"
              ? specifier.imported.name
              : String(specifier.imported.value),
          declaration: node,
          specifier,
        };
      }
    }
  }

  return null;
}

function jsxProps(code: string, jsx: any) {
  const props: string[] = [];

  for (const attr of jsx.openingElement.attributes) {
    if (attr.type === "JSXSpreadAttribute") {
      props.push(`...${code.slice(attr.argument.start, attr.argument.end)}`);
      continue;
    }

    const key =
      attr.name.type === "JSXIdentifier"
        ? attr.name.name
        : `${attr.name.namespace.name}:${attr.name.name.name}`;

    if (!attr.value) {
      props.push(`${JSON.stringify(key)}: true`);
      continue;
    }

    if (attr.value.type === "Literal") {
      props.push(`${JSON.stringify(key)}: ${JSON.stringify(attr.value.value)}`);
      continue;
    }

    if (attr.value.type === "JSXExpressionContainer") {
      const expression = attr.value.expression;

      if (expression.type !== "JSXEmptyExpression") {
        props.push(
          `${JSON.stringify(key)}: ${code.slice(
            expression.start,
            expression.end,
          )}`,
        );
      }

      continue;
    }

    props.push(
      `${JSON.stringify(key)}: ${code.slice(attr.value.start, attr.value.end)}`,
    );
  }

  return `{${props.join(",")}}`;
}

export function transformer(
  code: string,
  id: string,
): XanixTransformResult | null {
  // Cheap check. Don't parse irrelevant files.
  if (!/\b[A-Za-z_$][\w$]*\s*\.\s*send\s*\(\s*</.test(code)) {
    return null;
  }

  const ast = parseSync(id, code, {
    sourceType: "module",
    lang: "tsx",
  }).program;

  const replacements: {
    start: number;
    end: number;
    code: string;
  }[] = [];

  const entries: XanixPageEntry[] = [];

  let functionNode: any = null;
  let changed = false;

  walk(ast, {
    enter(node: any) {
      if (
        node.type === "FunctionDeclaration" ||
        node.type === "FunctionExpression" ||
        node.type === "ArrowFunctionExpression"
      ) {
        functionNode = node;
      }

      if (node.type !== "CallExpression") return;

      const callee = node.callee;

      if (
        callee.type !== "MemberExpression" ||
        callee.computed ||
        callee.property.type !== "Identifier" ||
        callee.property.name !== "send"
      ) {
        return;
      }

      const jsx = node.arguments[0];

      if (jsx?.type !== "JSXElement") return;
      if (!functionNode) return;

      const [req, res] = functionNode.params;

      if (req?.type !== "Identifier" || res?.type !== "Identifier") {
        return;
      }

      const componentName = jsxName(jsx.openingElement.name);

      if (!componentName) return;

      const componentImport = findComponentImport(ast, componentName);

      if (!componentImport) return;

      const componentFile = resolveComponentFile(id, componentImport.file);

      if (!path.isAbsolute(componentFile)) return;

      const file = normalizeFilePath(componentFile);
      const pageId = createPageId(file);

      entries.push({
        id: pageId,
        name: componentName,
        file,
        path: componentImport.file,
        export: componentImport.export,
      });

      // Remove component import.
      const declaration = componentImport.declaration;
      const specifier = componentImport.specifier;

      if (declaration.specifiers.length === 1) {
        replacements.push({
          start: declaration.start,
          end: declaration.end,
          code: "",
        });
      } else {
        const index = declaration.specifiers.indexOf(specifier);
        const next = declaration.specifiers[index + 1];
        const previous = declaration.specifiers[index - 1];

        replacements.push({
          start: next ? specifier.start : previous.end,
          end: next ? next.start : specifier.end,
          code: "",
        });
      }

      // Make handler async.
      if (!functionNode.async) {
        replacements.push({
          start: functionNode.start,
          end: functionNode.start,
          code: "async ",
        });
      }

      // Replace JSX.
      replacements.push({
        start: jsx.start,
        end: jsx.end,
        code: `await xanixPage({
  component: async () => await import(${JSON.stringify(componentImport.file)}),
  pageId: ${JSON.stringify(pageId)},
  req: ${req.name},
  res: ${res.name},
  props: ${jsxProps(code, jsx)}
})`,
      });

      changed = true;
    },

    leave(node: any) {
      if (node === functionNode) {
        functionNode = null;
      }
    },
  });

  if (!changed) return null;

  // Add runtime import.
  const runtime = `import { xanixPage } from "${RUNTIME_IMPORT}";\n`;

  if (!code.includes(`from "${RUNTIME_IMPORT}"`)) {
    replacements.push({
      start: 0,
      end: 0,
      code: runtime,
    });
  }

  // Apply replacements backwards.
  replacements.sort((a, b) => b.start - a.start);

  for (const replacement of replacements) {
    code =
      code.slice(0, replacement.start) +
      replacement.code +
      code.slice(replacement.end);
  }

  return {
    code,
    map: null,
    entries,
  };
}
