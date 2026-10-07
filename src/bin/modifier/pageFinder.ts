type SendFinderResult = {
  source: string;
  identifier: string;
  args: string[];
  start: number;
  end: number;
};

function pageFinder(code: string): SendFinderResult[] {
  const results: SendFinderResult[] = [];

  // Only store DEFAULT imports.
  //
  // import Home from "./Home";
  // import Layout, { Header } from "./Layout";
  // import Components, * as UI from "./components";
  //
  // Does NOT store:
  // import { Layout } from "./Layout";
  // import * as Pages from "./pages";
  const defaultImports = new Map<string, string>();
  const defaultImportRegex =
    /import\s+([A-Za-z_$][\w$]*)\s*(?:,\s*(?:\{[^}]*\}|\*\s+as\s+[A-Za-z_$][\w$]*))?\s+from\s*["']([^"']+)["']/g;

  for (const match of code.matchAll(defaultImportRegex)) {
    const local = match[1];
    const file = match[2];
    defaultImports.set(local, file);
  }

  const sendRegex = /([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\.send\s*\(/g;
  let match: RegExpExecArray | null;

  while ((match = sendRegex.exec(code))) {
    const identifier = `${match[1]}`;
    const start = match.index;
    const argsStart = sendRegex.lastIndex;
    let depth = 1;
    let i = argsStart;
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

    if (depth !== 0) {
      break;
    }

    const end = i + 1;
    const content = code.slice(argsStart, i);
    const args = splitArguments(content);
    const firstArg = args[0]?.trim();

    if (!firstArg?.startsWith("<")) {
      continue;
    }

    // <Home />
    // <Home>
    const jsxMatch = firstArg.match(/^<([A-Z_$][\w$]*)/);
    if (!jsxMatch) {
      continue;
    }

    const component = jsxMatch[1];
    const source = defaultImports.get(component);
    if (!source) {
      continue;
    }

    results.push({
      source,
      identifier,
      args,
      start,
      end,
    });
  }

  return results;
}

function splitArguments(code: string): string[] {
  const args: string[] = [];

  let start = 0;

  let paren = 0;
  let brace = 0;
  let bracket = 0;

  let quote: string | null = null;

  for (let i = 0; i < code.length; i++) {
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
      paren++;
    } else if (char === ")") {
      paren--;
    } else if (char === "{") {
      brace++;
    } else if (char === "}") {
      brace--;
    } else if (char === "[") {
      bracket++;
    } else if (char === "]") {
      bracket--;
    } else if (char === "," && paren === 0 && brace === 0 && bracket === 0) {
      args.push(code.slice(start, i).trim());
      start = i + 1;
    }
  }

  const last = code.slice(start).trim();

  if (last) {
    args.push(last);
  }

  return args;
}
export default pageFinder;
