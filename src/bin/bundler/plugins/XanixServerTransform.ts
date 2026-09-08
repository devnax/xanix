import type { Plugin } from "rolldown";

const RUNTIME_IMPORT = "xanix/runtime";

interface AstNode {
  type: string;
  start?: number;
  end?: number;
  [key: string]: any;
}

export interface XanixServerTransformOptions {
  mode: "watch" | "start";
}

function isIdentifier(node: AstNode | undefined, name?: string): boolean {
  if (!node || node.type !== "Identifier") {
    return false;
  }

  return name === undefined || node.name === name;
}

function isCallExpression(node: AstNode | undefined): boolean {
  return node?.type === "CallExpression";
}

function isMemberExpression(node: AstNode | undefined): boolean {
  return (
    node?.type === "MemberExpression" ||
    node?.type === "OptionalMemberExpression"
  );
}

function getMemberPropertyName(node: AstNode): string | null {
  if (!isMemberExpression(node)) {
    return null;
  }

  if (node.computed) {
    if (
      node.property?.type === "Literal" &&
      typeof node.property.value === "string"
    ) {
      return node.property.value;
    }

    return null;
  }

  if (node.property?.type === "Identifier") {
    return node.property.name;
  }

  return null;
}

function walk(
  node: AstNode,
  callback: (node: AstNode, parent: AstNode | null) => void,
  parent: AstNode | null = null,
): void {
  callback(node, parent);

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
        if (item && typeof item === "object") {
          if (typeof item.type === "string") {
            walk(item, callback, node);
          }
        }
      }

      continue;
    }

    if (value && typeof value === "object" && typeof value.type === "string") {
      walk(value, callback, node);
    }
  }
}

function findExpressServer(ast: AstNode): {
  appName: string;
  declarator: AstNode;
} | null {
  const expressApps = new Map<string, AstNode>();

  /*
   * Find:
   *
   * const app = express();
   */
  walk(ast, (node) => {
    if (node.type !== "VariableDeclarator") {
      return;
    }

    if (!isIdentifier(node.id)) {
      return;
    }

    if (!isCallExpression(node.init)) {
      return;
    }

    if (!isIdentifier(node.init.callee, "express")) {
      return;
    }

    expressApps.set(node.id.name, node);
  });

  if (!expressApps.size) {
    return null;
  }

  /*
   * Find:
   *
   * app.listen(...)
   */
  let result: {
    appName: string;
    declarator: AstNode;
  } | null = null;

  walk(ast, (node) => {
    if (result) {
      return;
    }

    if (node.type !== "CallExpression") {
      return;
    }

    const callee = node.callee;

    if (!isMemberExpression(callee)) {
      return;
    }

    if (getMemberPropertyName(callee) !== "listen") {
      return;
    }

    if (!isIdentifier(callee.object)) {
      return;
    }

    const declarator = expressApps.get(callee.object.name);

    if (!declarator) {
      return;
    }

    result = {
      appName: callee.object.name,
      declarator,
    };
  });

  return result;
}

function hasRuntimeImport(ast: AstNode): boolean {
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
        specifier.imported.name === "createXanixServer"
      ) {
        return true;
      }
    }
  }

  return false;
}

function createRuntimeImport(ast: AstNode): string {
  if (hasRuntimeImport(ast)) {
    return "";
  }

  return `import { createXanixServer } from "${RUNTIME_IMPORT}";\n`;
}

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

export default function XanixServerTransform(
  options: XanixServerTransformOptions,
): Plugin {
  return {
    name: "xanix-server-transform",

    transform: {
      filter: {
        id: /^(?!.*(?:node_modules[\\/])).*\.[cm]?[jt]sx?$/,
      },

      handler(code, id) {
        /*
         * IMPORTANT:
         *
         * This is Rolldown's parser.
         * No Babel parser.
         */
        let ast: AstNode;

        try {
          ast = this.parse(code, {
            lang: getLanguage(id),
          }) as AstNode;
        } catch {
          return null;
        }

        const server = findExpressServer(ast);

        if (!server) {
          return null;
        }

        const init = server.declarator.init;

        if (
          !init ||
          !isCallExpression(init) ||
          !isIdentifier(init.callee, "express")
        ) {
          return null;
        }

        if (init.start == null || init.end == null) {
          return null;
        }

        const replacement = `createXanixServer({ mode: ${JSON.stringify(options.mode)} })`;

        /*
         * We only need one source replacement.
         *
         * If you're using Rolldown native MagicString,
         * perform the overwrite there.
         */
        const importCode = createRuntimeImport(ast);

        const before = code.slice(0, init.start);

        const after = code.slice(init.end);

        const transformed = importCode + before + replacement + after;

        return {
          code: transformed,
          map: null,
        };
      },
    },
  };
}
