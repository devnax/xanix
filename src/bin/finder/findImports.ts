import { TOKENS } from "./stripComments.js";

export type ImportSpecifier = {
  imported: string;
  local: string;
  typeOnly: boolean;
};

export type ImportRecord = {
  source: string; // module path
  default?: string; // import Foo from "x"
  namespace?: string; // import * as Foo from "x"
  named: ImportSpecifier[]; // import { a, b as c } from "x"
  typeOnly: boolean; // import type ... from "x"
  start: number; // like an AST node: includes trailing `;` and import attributes
  end: number;
};

// Blank comments, regex literals and string/template contents (length preserved,
// quote characters kept) so imports inside them are never matched.
const mask = (code: string) =>
  code.replace(TOKENS, (m) =>
    /^["'`]/.test(m)
      ? m[0] + m.slice(1, -1).replace(/[^\r\n]/g, " ") + m.at(-1)
      : m.replace(/[^\r\n]/g, " "),
  );

const IMPORT_RE =
  /(?<![\w$.])(?<head>import(?![\w$])\s*)(?<pre>(?:(?<type>type\s+(?!from\b)(?=[\w$*{]))?(?<clause>[^;"'`]*?)\s*from\s*)?)(?<q>["'])(?<src>[^"']+)\k<q>(?:\s*(?:with|assert)\s*\{[^}]*\})?;?/g;

function findImports(code: string): ImportRecord[] {
  const records: ImportRecord[] = [];

  for (const m of mask(code).matchAll(IMPORT_RE)) {
    const g = m.groups!;
    const srcStart = m.index! + g.head.length + g.pre.length + 1;
    const clause = g.clause ?? "";

    const record: ImportRecord = {
      source: code.slice(srcStart, srcStart + g.src.length),
      named: [],
      typeOnly: !!g.type,
      start: m.index!,
      end: m.index! + m[0].length,
    };

    const namespace = /\*\s*as\s+([\w$]+)/.exec(clause)?.[1];
    if (namespace) record.namespace = namespace;

    const named = /\{([^}]*)\}/.exec(clause)?.[1];
    for (const item of named?.split(",") ?? []) {
      let s = item.trim();
      if (!s) continue;
      const typeOnly = /^type\s+(?!as\s)/.test(s);
      if (typeOnly) s = s.replace(/^type\s+/, "");
      const [imported, local] = s.split(/\s+as\s+/).map((x) => x.trim());
      record.named.push({ imported, local: local ?? imported, typeOnly });
    }

    const def = clause
      .replace(/\{[^}]*\}|\*\s*as\s+[\w$]+/g, "")
      .replace(/,/g, "")
      .trim();
    if (/^[\w$]+$/.test(def)) record.default = def;

    records.push(record);
  }

  return records;
}

export default findImports;
