const STRING = /"(?:\\[\s\S]|[^"\\])*"|'(?:\\[\s\S]|[^'\\])*'/;

// template literal: allows `${ ... }` with strings/templates inside (no nested braces),
// falls back to a plain backtick string
const TEMPLATE =
  /`(?:\\[\s\S]|\$\{(?:[^{}`]|`(?:\\[\s\S]|[^`\\])*`)*\}|[^`\\$]|\$(?!\{))*`|`(?:\\[\s\S]|[^`\\])*`/;

// regex literal: only where a regex can legally start (after an operator,
// opening bracket, keyword or start of file), and `/` allowed inside [...]
const REGEX =
  /(?<=(?:^|[(,=:[!&|?{};<>~^%*]|\b(?:return|typeof|case|void|delete|throw|yield|await|in|of))\s*)\/(?![/*])(?:\\.|\[(?:\\.|[^\]\\\r\n])*\]|[^/\\\r\n[])+\/[dgimsuvy]*/;

const COMMENT = /\/\*[\s\S]*?\*\/|\/\/[^\r\n]*/;

export const TOKENS = new RegExp(
  [STRING, TEMPLATE, REGEX, COMMENT].map((r) => r.source).join("|"),
  "g",
);

function stripComments(code: string): string {
  return code.replace(TOKENS, (m) =>
    m[0] === "/" && (m[1] === "/" || m[1] === "*")
      ? m.replace(/[^\r\n]/g, " ")
      : m,
  );
}

export default stripComments;
