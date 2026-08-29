import type { Plugin } from "rollup";
import { parse } from "@babel/parser";
import traverse, { type NodePath } from "@babel/traverse";
import generate from "@babel/generator";
import * as t from "@babel/types";

export interface XanixBrowserCodeOptions {
  target?: "server" | "client";
  globals?: string[];
}

const DEFAULT_BROWSER_GLOBALS = [
  "window",
  "document",
  "localStorage",
  "sessionStorage",
  "navigator",
  "location",
  "history",
  "screen",
  "indexedDB",
  "caches",

  "WebSocket",
  "File",
  "FileReader",
  "Blob",
  "FormData",
  "EventSource",
  "Worker",
  "SharedWorker",

  "IntersectionObserver",
  "ResizeObserver",
  "MutationObserver",
  "PerformanceObserver",

  "Notification",
  "BroadcastChannel",
  "MessageChannel",
  "MessageEvent",

  "URL",
  "URLSearchParams",

  "MediaSource",
  "MediaRecorder",

  "Audio",
  "Image",
  "HTMLImageElement",
];

export default function xanixBrowserCodeRemover(
  options: XanixBrowserCodeOptions = {},
): Plugin {
  const { target = "server", globals = DEFAULT_BROWSER_GLOBALS } = options;

  const browserGlobals = new Set(globals);

  return {
    name: "xanix-browser-code-remover",

    transform(code, id) {
      if (target !== "server") {
        return null;
      }

      if (id.includes("/node_modules/") || id.includes("\\node_modules\\")) {
        return null;
      }

      if (!/\.(?:[cm]?[jt]sx?)$/.test(id)) {
        return null;
      }

      const ast = parse(code, {
        sourceType: "module",
        plugins: [
          "jsx",
          "typescript",
          // "decorators-legacy",
          // "classProperties",
          // "classPrivateProperties",
          // "classPrivateMethods",
          // "optionalChaining",
          // "nullishCoalescingOperator",
          // "dynamicImport",
          // "topLevelAwait",
        ],
      });

      const removePaths = new Set<NodePath<t.Node>>();
      const replacePaths = new Set<NodePath<t.Node>>();

      function isBrowserGlobal(path: NodePath<t.Identifier>): boolean {
        const name = path.node.name;

        if (!browserGlobals.has(name)) {
          return false;
        }

        if (!path.isReferencedIdentifier()) {
          return false;
        }

        // Don't transform locally declared variables.
        if (path.scope.getBinding(name)) {
          return false;
        }

        return true;
      }

      function containsBrowserGlobal(path: NodePath<t.Node>): boolean {
        let found = false;

        path.traverse({
          Identifier(innerPath) {
            if (found) {
              return;
            }

            if (isBrowserGlobal(innerPath)) {
              found = true;
            }
          },
        });

        return found;
      }

      function getBrowserExpression(
        path: NodePath<t.Identifier>,
      ): NodePath<t.Node> {
        let current: NodePath<t.Node> = path;

        while (current.parentPath) {
          const parent = current.parentPath as any;

          /*
           * window.foo
           * window.foo.bar
           * window["foo"]
           */
          if (
            parent.isMemberExpression() ||
            parent.isOptionalMemberExpression()
          ) {
            current = parent;
            continue;
          }

          /*
           * window.foo()
           * window.foo.bar()
           */
          if (parent.isCallExpression() || parent.isOptionalCallExpression()) {
            const callee = parent.get("callee");

            if (!Array.isArray(callee) && callee.node === current.node) {
              current = parent;
              continue;
            }

            break;
          }

          /*
           * window.foo!
           */
          if (parent.isTSNonNullExpression()) {
            current = parent;
            continue;
          }

          /*
           * window.foo as Something
           */
          if (parent.isTSAsExpression()) {
            current = parent;
            continue;
          }

          break;
        }

        return current;
      }

      function findContainingStatement(
        path: NodePath<t.Node>,
      ): NodePath<t.Node> | null {
        let current: NodePath<t.Node> = path;

        while (current.parentPath) {
          const parent = current.parentPath;

          if (parent.isExpressionStatement()) {
            return parent;
          }

          if (
            parent.isFunctionDeclaration() ||
            parent.isFunctionExpression() ||
            parent.isArrowFunctionExpression()
          ) {
            return null;
          }

          current = parent;
        }

        return null;
      }

      function markRemove(path: NodePath<t.Node>) {
        if (!path.removed) {
          removePaths.add(path);
        }
      }

      function markReplace(path: NodePath<t.Node>) {
        if (!path.removed) {
          replacePaths.add(path);
        }
      }

      traverse(ast, {
        /*
         * ---------------------------------------------------------
         * JSX
         *
         * <div>{window.innerWidth}</div>
         *
         * ->
         *
         * <div>{undefined}</div>
         * ---------------------------------------------------------
         */
        JSXExpressionContainer(path) {
          const expression = path.get("expression");

          if (!expression || Array.isArray(expression)) {
            return;
          }

          if (expression.isJSXEmptyExpression()) {
            return;
          }

          if (!expression.isExpression()) {
            return;
          }

          if (!containsBrowserGlobal(expression)) {
            return;
          }

          markReplace(expression);
        },

        /*
         * ---------------------------------------------------------
         * Standalone browser statements
         *
         * window.addEventListener(...)
         * document.title = "Xanix"
         * localStorage.setItem(...)
         *
         * ->
         *
         * removed
         * ---------------------------------------------------------
         */
        ExpressionStatement(path) {
          if (!containsBrowserGlobal(path)) {
            return;
          }

          markRemove(path);
        },

        /*
         * ---------------------------------------------------------
         * Variable declarations
         *
         * const width = window.innerWidth;
         *
         * ->
         *
         * const width = undefined;
         * ---------------------------------------------------------
         */
        VariableDeclarator(path) {
          const init = path.get("init");

          if (!init || Array.isArray(init)) {
            return;
          }

          if (!init.isExpression()) {
            return;
          }

          if (!containsBrowserGlobal(init)) {
            return;
          }

          markReplace(init);
        },

        /*
         * ---------------------------------------------------------
         * Return
         *
         * return window.innerWidth;
         *
         * ->
         *
         * return undefined;
         * ---------------------------------------------------------
         */
        ReturnStatement(path) {
          const argument = path.get("argument");

          if (!argument || Array.isArray(argument)) {
            return;
          }

          if (!argument.isExpression()) {
            return;
          }

          if (!containsBrowserGlobal(argument)) {
            return;
          }

          markReplace(argument);
        },

        /*
         * ---------------------------------------------------------
         * Identifier
         * ---------------------------------------------------------
         */
        Identifier(path) {
          if (!isBrowserGlobal(path)) {
            return;
          }

          const browserExpression = getBrowserExpression(path);

          /*
           * JSXExpressionContainer is handled above.
           */
          if (browserExpression.parentPath?.isJSXExpressionContainer()) {
            return;
          }

          /*
           * Example:
           *
           * window.addEventListener(...)
           *
           * Remove the complete statement.
           */
          const statement = findContainingStatement(browserExpression);

          if (statement) {
            markRemove(statement);
            return;
          }

          const parent = browserExpression.parentPath;

          /*
           * Variable initializer:
           *
           * const x = window.foo;
           */
          if (parent?.isVariableDeclarator()) {
            markReplace(browserExpression);
            return;
          }

          /*
           * Return:
           *
           * return window.foo;
           */
          if (parent?.isReturnStatement()) {
            markReplace(browserExpression);
            return;
          }

          /*
           * General expression:
           *
           * console.log(window.innerWidth)
           *
           * ->
           *
           * console.log(undefined)
           */
          markReplace(browserExpression);
        },
      });

      /*
       * Remove first.
       */
      for (const path of removePaths) {
        if (!path.removed) {
          path.remove();
        }
      }

      /*
       * Replace second.
       */
      for (const path of replacePaths) {
        if (!path.removed) {
          path.replaceWith(t.identifier("undefined"));
        }
      }

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
      } as any;
    },
  };
}
