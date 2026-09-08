import type { Plugin } from "rolldown";

import path from "node:path";
import fs from "node:fs";

import { getClientRuntimeFile } from "../../include/utils.js";

const root = process.cwd();

type AstNode = {
  type?: string;
  start?: number;
  end?: number;
  id?: AstNode | null;
  name?: string;
  init?: AstNode | null;
  [key: string]: unknown;
};

function getLanguage(id: string): "js" | "jsx" | "ts" | "tsx" {
  const filename = id.split("?")[0];

  if (filename.endsWith(".tsx")) {
    return "tsx";
  }

  if (filename.endsWith(".ts")) {
    return "ts";
  }

  if (filename.endsWith(".jsx")) {
    return "jsx";
  }

  return "js";
}

function isReactComponent(name: string): boolean {
  return /^[A-Z][A-Za-z0-9_$]*$/.test(name);
}

function walk(node: unknown, callback: (node: AstNode) => void): void {
  if (!node || typeof node !== "object") {
    return;
  }

  if (Array.isArray(node)) {
    for (const child of node) {
      walk(child, callback);
    }

    return;
  }

  const current = node as AstNode;

  callback(current);

  for (const key of Object.keys(current)) {
    if (
      key === "parent" ||
      key === "loc" ||
      key === "range" ||
      key === "tokens" ||
      key === "comments"
    ) {
      continue;
    }

    const value = current[key];

    if (value && typeof value === "object") {
      walk(value, callback);
    }
  }
}

function collectRegistrations(program: unknown, filename: string): string[] {
  const registrations: string[] = [];

  walk(program, (node) => {
    if (node.type === "FunctionDeclaration") {
      const id = node.id;

      if (!id || id.type !== "Identifier" || !id.name) {
        return;
      }

      const name = id.name;

      if (!isReactComponent(name)) {
        return;
      }

      registrations.push(createRegistration(name, filename));

      return;
    }

    if (node.type !== "VariableDeclarator") {
      return;
    }

    const id = node.id;
    const init = node.init;

    if (!id || id.type !== "Identifier" || !id.name) {
      return;
    }

    if (!init) {
      return;
    }

    if (
      init.type !== "ArrowFunctionExpression" &&
      init.type !== "FunctionExpression"
    ) {
      return;
    }

    const name = id.name;

    if (!isReactComponent(name)) {
      return;
    }

    registrations.push(createRegistration(name, filename));
  });

  return registrations;
}

function createRegistration(name: string, filename: string): string {
  const relative = path
    .relative(root, filename.split("?")[0])
    .replaceAll("\\", "/");

  const componentId = `${relative}:${name}`;

  return `$RefreshReg$(${name}, ${JSON.stringify(componentId)});`;
}

export default function xanixReactRefresh(webSocketPort: number): Plugin {
  return {
    name: "xanix-react-refresh",

    load(id) {
      if (path.resolve(id) !== getClientRuntimeFile()) {
        return null;
      }

      const code = fs.readFileSync(id, "utf8");

      const refreshCode = `
${code}

import * as RefreshRuntime from "react-refresh/runtime";

RefreshRuntime.injectIntoGlobalHook(window);

window.$RefreshReg$ = (type, id) => {
  RefreshRuntime.register(type, id);
};

window.$RefreshSig$ =
  RefreshRuntime.createSignatureFunctionForTransform;

const ws = new WebSocket(
  ${JSON.stringify(`ws://localhost:${webSocketPort}`)}
);

ws.onmessage = async (event) => {
  const files = JSON.parse(event.data);

  for (const file of files) {
    if (!file.endsWith(".js")) {
      continue;
    }
    const url =
      getImportUrl(
        file.replace(/\.js$/, "")
      ) +
      "?t=" +
      Date.now();

    await import(url);
  }

  RefreshRuntime.performReactRefresh();

  ws.send("reload");
};
`;

      return {
        code: refreshCode,
        map: null,
      };
    },

    transform: {
      filter: {
        id: /^(?!.*node_modules[\\/]).*\.[cm]?[jt]sx?$/,
      },

      handler(code, id) {
        const resolvedId = path.resolve(id);

        if (resolvedId === getClientRuntimeFile()) {
          return null;
        }

        const filename = id.split("?")[0];

        if (!/\.(tsx?|jsx?)$/.test(filename)) {
          return null;
        }

        const program = this.parse(code, {
          lang: getLanguage(filename),
        });

        const registrations = collectRegistrations(program, filename);

        if (registrations.length === 0) {
          return null;
        }

        const registrationCode = `\n\n${registrations.join("\n")}\n`;

        return {
          code: code + registrationCode,
          map: null,
        };
      },
    },
  };
}
