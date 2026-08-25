import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import { parse } from "@babel/parser";
import traverse from "@babel/traverse";
import * as t from "@babel/types";
import { XanixClientEntry } from "../../../types";

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
        };
      }
    }
  }

  return null;
}

export function entryFinder(code: string, id: string): XanixClientEntry[] {
  const ast = parse(code, {
    sourceType: "module",
    plugins: ["typescript", "jsx"],
  });

  const entries = new Map<string, XanixClientEntry>();

  traverse(ast, {
    CallExpression(callPath) {
      const call = callPath.node;

      /*
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

      const root = process.cwd();

      const relativeSource = path.relative(root, componentFile);

      const parsed = path.parse(relativeSource);

      const buildPath = normalizeFilePath(
        path.resolve(root, ".xanix", parsed.dir, `${parsed.name}.js`),
      );

      const entry: XanixClientEntry = {
        id: clientId,
        name: componentName,
        file: normalizedFile,
        path: componentImportPath,
        build: buildPath,
        export: componentImport.export,
      };

      entries.set(clientId, entry);
    },
  });

  return Array.from(entries.values());
}
