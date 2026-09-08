import type { Plugin } from "rolldown";
import crypto from "node:crypto";
import path from "node:path";

type Options = {
  isClient: boolean;
  root?: string;
};

const XANIX_PACKAGE = "xanix";

interface AstNode {
  type: string;
  start?: number;
  end?: number;
  [key: string]: any;
}

interface TransformEdit {
  start: number;
  end: number;
  content: string;
}

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

const source = (code: string, node: AstNode): string =>
  code.slice(node.start!, node.end!);

/* ============================================================
   AST walker
   ============================================================ */

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
        if (item && typeof item === "object" && typeof item.type === "string") {
          walk(item, visitor, node, nextAncestors);
        }
      }

      continue;
    }

    if (value && typeof value === "object" && typeof value.type === "string") {
      walk(value, visitor, node, nextAncestors);
    }
  }
}

/* ============================================================
   Find local useServer name

   import { useServer } from "xanix";

   import {
     useServer as server
   } from "xanix";
   ============================================================ */

function getUseServerName(ast: AstNode): string | null {
  for (const statement of ast.body ?? []) {
    if (statement.type !== "ImportDeclaration") {
      continue;
    }

    if (statement.source?.value !== XANIX_PACKAGE) {
      continue;
    }

    for (const specifier of statement.specifiers ?? []) {
      if (specifier.type !== "ImportSpecifier") {
        continue;
      }

      const imported = specifier.imported;

      if (imported?.type === "Identifier" && imported.name === "useServer") {
        return specifier.local.name;
      }

      if (imported?.type === "Literal" && imported.value === "useServer") {
        return specifier.local.name;
      }
    }
  }

  return null;
}

/* ============================================================
   Detect:

   useServer(...)
   ============================================================ */

function isUseServer(node: AstNode, localName: string): boolean {
  return (
    node.type === "CallExpression" &&
    node.callee?.type === "Identifier" &&
    node.callee.name === localName
  );
}

/* ============================================================
   Create:

   {
     uid: "abc",
     args: {
       id
     }
   }

   OR:

   {
     uid: "abc",
     args: {
       ...args
     }
   }
   ============================================================ */

function createServerRequest(
  code: string,
  props: AstNode | undefined,
  uid: string,
): string {
  const args = props ? source(code, props) : "{}";

  return ["{", `uid: ${JSON.stringify(uid)},`, `args: ${args},`, "}"].join(
    "\n",
  );
}

/* ============================================================
   Find Xanix import
   ============================================================ */

function findXanixImport(ast: AstNode): AstNode | null {
  for (const statement of ast.body ?? []) {
    if (
      statement.type === "ImportDeclaration" &&
      statement.source?.value === XANIX_PACKAGE
    ) {
      return statement;
    }
  }

  return null;
}

/* ============================================================
   Check registerUseServer import
   ============================================================ */

function hasRegisterUseServerImport(ast: AstNode): boolean {
  const xanixImport = findXanixImport(ast);

  if (!xanixImport) {
    return false;
  }

  for (const specifier of xanixImport.specifiers ?? []) {
    if (specifier.type !== "ImportSpecifier") {
      continue;
    }

    const imported = specifier.imported;

    if (
      imported?.type === "Identifier" &&
      imported.name === "registerUseServer"
    ) {
      return true;
    }

    if (
      imported?.type === "Literal" &&
      imported.value === "registerUseServer"
    ) {
      return true;
    }
  }

  return false;
}

/* ============================================================
   Create import edit

   Existing:

   import { useServer } from "xanix";

   becomes:

   import {
     useServer,
     registerUseServer
   } from "xanix";
   ============================================================ */

function createRegisterImportEdit(
  code: string,
  ast: AstNode,
): TransformEdit | null {
  if (hasRegisterUseServerImport(ast)) {
    return null;
  }

  const xanixImport = findXanixImport(ast);

  if (!xanixImport) {
    return {
      start: 0,
      end: 0,
      content: `import { registerUseServer } from "xanix";\n`,
    };
  }

  const specifiers = xanixImport.specifiers ?? [];

  /*
   * import "xanix";
   */
  if (!specifiers.length) {
    return {
      start: xanixImport.start!,
      end: xanixImport.end!,
      content: `import { registerUseServer } from "xanix";`,
    };
  }

  /*
   * Insert before the closing "}".
   *
   * We don't regenerate the import.
   * We simply append a named specifier.
   */
  const lastSpecifier = specifiers[specifiers.length - 1];

  if (lastSpecifier?.end == null) {
    return null;
  }

  return {
    start: lastSpecifier.end,
    end: lastSpecifier.end,
    content: ", registerUseServer",
  };
}

/* ============================================================
   Insert registrations after imports
   ============================================================ */

function getImportInsertionPosition(ast: AstNode): number {
  const body = ast.body ?? [];

  let position = 0;

  for (const statement of body) {
    if (statement.type !== "ImportDeclaration") {
      break;
    }

    if (statement.end != null) {
      position = statement.end;
    }
  }

  return position;
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

function transformClient(
  code: string,
  ast: AstNode,
  filePath: string,
  useServerName: string,
) {
  let index = 0;

  const edits: TransformEdit[] = [];

  walk(ast, (node) => {
    if (!isUseServer(node, useServerName)) {
      return;
    }

    const callback = node.arguments?.[0];

    if (
      !callback ||
      !(
        callback.type === "ArrowFunctionExpression" ||
        callback.type === "FunctionExpression"
      )
    ) {
      return;
    }

    const props = node.arguments?.[1];

    const uid = createUID(filePath, index++);

    const request = createServerRequest(code, props, uid);

    edits.push({
      start: node.start!,
      end: node.end!,
      content: `${useServerName}(${request})`,
    });
  });

  if (!edits.length) {
    return null;
  }

  return applyEdits(code, edits, filePath);
}

/* ============================================================
   SERVER

   Source:

   useServer(
     async ({ id }) => getUser(id),
     { id }
   )

   becomes:

   registerUseServer(
     "abc123",
     async ({ id }) => getUser(id)
   );

   useServer({
     uid: "abc123",
     args: { id }
   })
   ============================================================ */

function transformServer(
  code: string,
  ast: AstNode,
  filePath: string,
  useServerName: string,
) {
  let index = 0;

  const edits: TransformEdit[] = [];
  const registrations: string[] = [];

  walk(ast, (node) => {
    if (!isUseServer(node, useServerName)) {
      return;
    }

    const callback = node.arguments?.[0];

    if (
      !callback ||
      !(
        callback.type === "ArrowFunctionExpression" ||
        callback.type === "FunctionExpression"
      )
    ) {
      return;
    }

    const props = node.arguments?.[1];

    const uid = createUID(filePath, index++);

    /*
     * registerUseServer(
     *   "abc123",
     *   async ({ id }) => getUser(id)
     * );
     */
    registrations.push(
      [
        "registerUseServer(",
        `${JSON.stringify(uid)},`,
        `${source(code, callback)}`,
        ");",
      ].join("\n"),
    );

    /*
     * Replace:
     *
     * useServer(callback, props)
     *
     * with:
     *
     * useServer({
     *   uid,
     *   args
     * })
     */
    const request = createServerRequest(code, props, uid);

    edits.push({
      start: node.start!,
      end: node.end!,
      content: `${useServerName}(${request})`,
    });
  });

  if (!edits.length) {
    return null;
  }

  /*
   * Add registerUseServer import.
   */
  const importEdit = createRegisterImportEdit(code, ast);

  if (importEdit) {
    edits.push(importEdit);
  }

  /*
   * Insert registrations after imports.
   */
  const importPosition = getImportInsertionPosition(ast);

  if (registrations.length) {
    edits.push({
      start: importPosition,
      end: importPosition,
      content: `\n\n${registrations.join("\n\n")}\n`,
    });
  }

  return applyEdits(code, edits, filePath);
}

/* ============================================================
   Apply edits
   ============================================================ */

function applyEdits(code: string, edits: TransformEdit[], filePath: string) {
  /*
   * Sort backwards so source offsets
   * remain valid.
   */
  edits.sort((a, b) => b.start - a.start);

  let result = code;

  let lastStart = Number.POSITIVE_INFINITY;

  for (const edit of edits) {
    /*
     * Ignore overlapping edits.
     */
    if (edit.end > lastStart) {
      continue;
    }

    result =
      result.slice(0, edit.start) + edit.content + result.slice(edit.end);

    lastStart = edit.start;
  }

  /*
   * We deliberately don't fabricate
   * a sourcemap here.
   *
   * The plugin returns null below.
   */
  return {
    code: result,
    map: null,
  };
}

/* ============================================================
   Plugin
   ============================================================ */

export default function XanixUseServer(options: Options): Plugin {
  const root = path.resolve(options.root ?? process.cwd());

  return {
    name: "xanix-use-server",

    transform: {
      filter: {
        id: /^(?!.*(?:node_modules[\\/])).*\.[cm]?[jt]sx?$/,
      },

      handler(code, id) {
        const filename = id.split("?")[0];

        const relativePath = normalizePath(path.relative(root, filename));

        let ast: AstNode;

        try {
          /*
           * Rolldown/Oxc parser.
           *
           * This parses the original
           * TypeScript / TSX / JSX source.
           */
          ast = this.parse(code, {
            lang: getLanguage(filename),
          }) as AstNode;
        } catch {
          return null;
        }

        const useServerName = getUseServerName(ast);

        if (!useServerName) {
          return null;
        }

        const result = options.isClient
          ? transformClient(code, ast, relativePath, useServerName)
          : transformServer(code, ast, relativePath, useServerName);

        if (!result) {
          return null;
        }

        return {
          code: result.code,
          map: result.map,
        };
      },
    },
  };
}

/* ============================================================
   Language
   ============================================================ */

function getLanguage(id: string): "js" | "jsx" | "ts" | "tsx" {
  const file = id.split("?")[0];

  if (file.endsWith(".tsx")) {
    return "tsx";
  }

  if (file.endsWith(".ts")) {
    return "ts";
  }

  if (file.endsWith(".jsx")) {
    return "jsx";
  }

  return "js";
}
