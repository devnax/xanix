type Replacement = {
  start: number;
  end: number;
  value: string;
};

export class TransformReactContext {
  private readonly reactNamespaces = new Set<string>();
  private readonly createContextBindings = new Set<string>();
  readonly replacements: Replacement[] = [];

  transform(node: any) {
    this.detectReactImport(node);
    this.detectReactRequire(node);
    this.detectCreateContext(node);
  }

  private detectReactImport(node: any) {
    if (node.type !== "ImportDeclaration" || node.source?.value !== "react") {
      return;
    }

    for (const specifier of node.specifiers) {
      // import React from "react"
      if (specifier.type === "ImportDefaultSpecifier") {
        this.reactNamespaces.add(specifier.local.name);
        continue;
      }

      // import * as React from "react"
      if (specifier.type === "ImportNamespaceSpecifier") {
        this.reactNamespaces.add(specifier.local.name);
        continue;
      }

      // import { createContext } from "react"
      // import { createContext as ctx } from "react"
      if (
        specifier.type === "ImportSpecifier" &&
        specifier.imported?.name === "createContext"
      ) {
        this.createContextBindings.add(specifier.local.name);
      }
    }
  }

  private detectReactRequire(node: any) {
    if (node.type !== "VariableDeclarator") {
      return;
    }

    if (!this.isReactRequire(node.init)) {
      return;
    }

    // const React = require("react")
    if (node.id.type === "Identifier") {
      this.reactNamespaces.add(node.id.name);
      return;
    }

    // const { createContext } = require("react")
    // const { createContext: ctx } = require("react")
    if (node.id.type === "ObjectPattern") {
      for (const property of node.id.properties) {
        if (property.type !== "Property" || property.computed) {
          continue;
        }

        if (
          property.key.type === "Identifier" &&
          property.key.name === "createContext"
        ) {
          const local =
            property.value.type === "Identifier" ? property.value.name : null;

          if (local) {
            this.createContextBindings.add(local);
          }
        }
      }
    }
  }

  private isReactRequire(node: any): boolean {
    return (
      node?.type === "CallExpression" &&
      node.callee?.type === "Identifier" &&
      node.callee.name === "require" &&
      node.arguments?.length === 1 &&
      node.arguments[0]?.type === "Literal" &&
      node.arguments[0].value === "react"
    );
  }

  private detectCreateContext(node: any) {
    if (node.type !== "CallExpression") {
      return;
    }

    // createContext(...)
    // createCtx(...)
    if (
      node.callee.type === "Identifier" &&
      this.createContextBindings.has(node.callee.name)
    ) {
      this.replaceCallee(node.callee);
      return;
    }

    // React.createContext(...)
    if (
      node.callee.type === "MemberExpression" &&
      !node.callee.computed &&
      node.callee.object.type === "Identifier" &&
      node.callee.property.type === "Identifier" &&
      node.callee.property.name === "createContext" &&
      this.reactNamespaces.has(node.callee.object.name)
    ) {
      this.replaceCallee(node.callee);
    }
  }

  private replaceCallee(callee: any) {
    this.replacements.push({
      start: callee.start,
      end: callee.end,
      value: "__xanix.createContext",
    });
  }
}

export default TransformReactContext;
