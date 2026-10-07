type SendFinderResult = {
  file: string;
  identifier: string;
};

function sendFinder(code: string): SendFinderResult[] {
  const results: SendFinderResult[] = [];

  // Find imports first.
  const imports = new Map<string, string>();

  const importRegex =
    /import\s+(?:(\w+)\s*,?\s*)?(?:\{\s*([^}]+)\s*\})?\s*from\s*["']([^"']+)["']/g;

  for (const match of code.matchAll(importRegex)) {
    const defaultName = match[1];
    const named = match[2];
    const file = match[3];

    if (defaultName) {
      imports.set(defaultName, file);
    }

    if (named) {
      for (const item of named.split(",")) {
        const [imported, local = imported] = item.trim().split(/\s+as\s+/);

        imports.set(local, file);
      }
    }
  }

  // import * as Pages from "./pages"
  const namespaceRegex = /import\s+\*\s+as\s+(\w+)\s+from\s*["']([^"']+)["']/g;

  for (const match of code.matchAll(namespaceRegex)) {
    imports.set(match[1], match[2]);
  }

  // Find:
  //
  // res.send(<Home />)
  // response.send(<Layout />)
  // ctx.send(<Pages.Home />)
  //
  const sendRegex = /(\w+(?:\.\w+)?)\.send\s*\(/g;

  let match: RegExpExecArray | null;

  while ((match = sendRegex.exec(code))) {
    const identifier = `${match[1]}.send`;
    const contentStart = sendRegex.lastIndex;

    let depth = 1;
    let i = contentStart;
    let quote: string | null = null;

    for (; i < code.length; i++) {
      const char = code[i];

      if (quote) {
        if (char === "\\") {
          i++;
        } else if (char === quote) {
          quote = null;
        }

        continue;
      }

      if (char === "'" || char === '"' || char === "`") {
        quote = char;
        continue;
      }

      if (char === "(") {
        depth++;
      } else if (char === ")") {
        depth--;

        if (depth === 0) {
          break;
        }
      }
    }

    const argument = code.slice(contentStart, i).trim();

    // Must start with JSX.
    if (!argument.startsWith("<")) {
      continue;
    }

    // <Home />
    // <Home>
    // <Pages.Home />
    const jsxMatch = argument.match(/^<([A-Z_$][\w$]*(?:\.[A-Z_$][\w$]*)?)/);

    if (!jsxMatch) {
      continue;
    }

    const component = jsxMatch[1];

    // Home
    if (!component.includes(".")) {
      const file = imports.get(component);

      if (file) {
        results.push({
          file,
          identifier,
        });
      }

      continue;
    }

    // Pages.Home
    const namespace = component.split(".")[0];
    const file = imports.get(namespace);

    if (file) {
      results.push({
        file,
        identifier,
      });
    }
  }

  return results;
}

export default sendFinder;
