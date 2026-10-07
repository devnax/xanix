type ImportInfo = {
  specifiers: {
    local: string;
    imported: string;
  }[];
  namespace?: string;
};

function importFinder(code: string, module: string): ImportInfo[] {
  const result: ImportInfo[] = [];

  const escaped = module.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // import { foo, bar as baz } from "module"
  const namedImport = new RegExp(
    `import\\s*\\{([^}]*)\\}\\s*from\\s*["']${escaped}["']`,
    "g",
  );

  const destructuredRequire = new RegExp(
    `(?:const|let|var)\\s*\\{([^}]*)\\}\\s*=\\s*require\\s*\\(\\s*["']${escaped}["']\\s*\\)`,
    "g",
  );

  for (const match of code.matchAll(destructuredRequire)) {
    const specifiers = match[1]
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => {
        const [imported, local] = item.split(/\s*:\s*/).map((x) => x.trim());

        return {
          local: local ?? imported,
          imported,
        };
      });

    result.push({ specifiers });
  }

  for (const match of code.matchAll(namedImport)) {
    const specifiers = match[1]
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => {
        const [imported, local] = item.split(/\s+as\s+/).map((x) => x.trim());

        return {
          local: local ?? imported,
          imported,
        };
      });

    result.push({ specifiers });
  }

  // import foo, { bar } from "module"
  const defaultImport = new RegExp(
    `import\\s+([\\w$]+)\\s+from\\s*["']${escaped}["']`,
    "g",
  );

  for (const match of code.matchAll(defaultImport)) {
    result.push({
      specifiers: [
        {
          local: match[1],
          imported: "default",
        },
      ],
    });
  }

  // import * as foo from "module"
  const namespaceImport = new RegExp(
    `import\\s*\\*\\s*as\\s*([\\w$]+)\\s*from\\s*["']${escaped}["']`,
    "g",
  );

  for (const match of code.matchAll(namespaceImport)) {
    result.push({
      specifiers: [],
      namespace: match[1],
    });
  }

  // const foo = require("module")
  const requireImport = new RegExp(
    `(?:const|let|var)\\s+([\\w$]+)\\s*=\\s*require\\s*\\(\\s*["']${escaped}["']\\s*\\)`,
    "g",
  );

  for (const match of code.matchAll(requireImport)) {
    result.push({
      specifiers: [
        {
          local: match[1],
          imported: "default",
        },
      ],
    });
  }

  return result;
}

export default importFinder;
