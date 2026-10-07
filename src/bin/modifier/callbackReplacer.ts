function callbackReplacer(
  code: string,
  name: string,
  replacer: (args: string[]) => string | void,
) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`${escaped}\\(`, "g");

  let result = "";
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(code))) {
    const start = match.index;
    const contentStart = regex.lastIndex;

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

    if (depth !== 0) {
      break;
    }

    const content = code.slice(contentStart, i);

    const args: string[] = [];
    let argStart = 0;
    let paren = 0;
    let brace = 0;
    let bracket = 0;
    quote = null;

    for (let j = 0; j < content.length; j++) {
      const char = content[j];

      if (quote) {
        if (char === "\\") {
          j++;
        } else if (char === quote) {
          quote = null;
        }

        continue;
      }

      if (char === "'" || char === '"' || char === "`") {
        quote = char;
        continue;
      }

      if (char === "(") paren++;
      else if (char === ")") paren--;
      else if (char === "{") brace++;
      else if (char === "}") brace--;
      else if (char === "[") bracket++;
      else if (char === "]") bracket--;

      if (char === "," && paren === 0 && brace === 0 && bracket === 0) {
        args.push(content.slice(argStart, j).trim());
        argStart = j + 1;
      }
    }

    const lastArg = content.slice(argStart).trim();

    if (lastArg) {
      args.push(lastArg);
    }

    result += code.slice(last, start);
    const replaced = replacer(args);
    if (replaced !== undefined) {
      result += replaced;
    } else {
      result += code.slice(start, i + 1);
    }

    last = i + 1;
    regex.lastIndex = i + 1;
  }

  return result + code.slice(last);
}

export default callbackReplacer;
