export type ImportInfo = {
  specifiers: { local: string; imported: string }[];
  namespace?: string;
};

function importFinder(code: string, module: string): ImportInfo[] {
  const esc = module.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const from = `(?:"${esc}"|'${esc}')`;
  const found: { index: number; info: ImportInfo }[] = [];

  // import a, { b as c }, * as ns from "module"  (skips `import type ...`)
  const importRe = new RegExp(
    `(?<![\\w$.])import(?![\\w$])(?!\\s+type\\s+[\\w$*{])\\s*([^;"']*?)\\s*from\\s*${from}`,
    "g",
  );

  for (const m of code.matchAll(importRe)) {
    const clause = m[1];
    const specifiers: ImportInfo["specifiers"] = [];
    const namespace = /\*\s*as\s+([\w$]+)/.exec(clause)?.[1];
    const named = /\{([^}]*)\}/.exec(clause)?.[1];
    const def = clause
      .replace(/\{[^}]*\}|\*\s*as\s+[\w$]+/g, "")
      .replace(/,/g, "")
      .trim();

    if (/^[\w$]+$/.test(def))
      specifiers.push({ local: def, imported: "default" });

    for (const item of named?.split(",") ?? []) {
      const s = item.trim();
      if (!s || /^type\s+(?!as\s)/.test(s)) continue;
      const [imported, local] = s.split(/\s+as\s+/).map((x) => x.trim());
      specifiers.push({ local: local ?? imported, imported });
    }

    found.push({
      index: m.index!,
      info: namespace ? { specifiers, namespace } : { specifiers },
    });
  }

  // const a = require("module") / const { b, c: d } = require("module")
  const requireRe = new RegExp(
    `(?<![\\w$.])(?:const|let|var)\\s+(?:([\\w$]+)|\\{([^}]*)\\})\\s*=\\s*require\\s*\\(\\s*${from}\\s*\\)(?![.(\\[])`,
    "g",
  );

  for (const m of code.matchAll(requireRe)) {
    const specifiers: ImportInfo["specifiers"] = [];

    if (m[1]) {
      specifiers.push({ local: m[1], imported: "default" });
    } else {
      for (const item of m[2].split(",")) {
        const s = item.trim().replace(/\s*=[\s\S]*$/, ""); // drop defaults
        if (!s || s.startsWith("...")) continue;
        const [imported, local] = s.split(/\s*:\s*/).map((x) => x.trim());
        specifiers.push({ local: local ?? imported, imported });
      }
    }

    found.push({ index: m.index!, info: { specifiers } });
  }

  return found.sort((a, b) => a.index - b.index).map((f) => f.info);
}

export default importFinder;
