import { TOKENS } from "./stripComments.js";

const mask = (code: string) =>
  code.replace(TOKENS, (m) =>
    /^["'`]/.test(m)
      ? m[0] + m.slice(1, -1).replace(/[^\r\n]/g, " ") + m.at(-1)
      : m.replace(/[^\r\n]/g, " "),
  );

function callbackReplacer(
  code: string,
  name: string,
  replacer: (args: string[]) => string | void,
) {
  const masked = mask(code);
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(?<![\\w$.])${escaped}\\s*\\(`, "g");

  let result = "";
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = re.exec(masked))) {
    const start = m.index;
    const cs = re.lastIndex;

    // find the matching ")"
    let depth = 1;
    let i = cs;
    for (; i < masked.length && depth; i++) {
      if (masked[i] === "(") depth++;
      else if (masked[i] === ")") depth--;
    }
    if (depth) break; // unbalanced: leave the rest untouched
    const end = i - 1;

    // split top-level args
    const args: string[] = [];
    let argStart = cs;
    let d = 0;
    for (let j = cs; j < end; j++) {
      const c = masked[j];
      if (c === "(" || c === "[" || c === "{") d++;
      else if (c === ")" || c === "]" || c === "}") d--;
      else if (c === "," && d === 0) {
        args.push(code.slice(argStart, j).trim());
        argStart = j + 1;
      }
    }
    const tail = code.slice(argStart, end).trim();
    if (tail) args.push(tail);

    result += code.slice(last, start);
    const out = replacer(args);
    result += out !== undefined ? out : code.slice(start, end + 1);
    last = re.lastIndex = end + 1;
  }

  return result + code.slice(last);
}

export default callbackReplacer;
