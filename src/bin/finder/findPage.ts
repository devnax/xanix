import findImports from "./findImports.js";

export type SendFinderResult = {
  source: string;
  identifier: string;
  args: string[];
  start: number;
  end: number;
};

const ID = "[A-Za-z_$][\\w$]*";

function pageFinder(code: string): SendFinderResult[] {
  // default imports only:
  //   import Home from "./Home";
  //   import Layout, { Header } from "./Layout";
  //   import Components, * as UI from "./components";
  const defaultImports = new Map<string, string>();
  for (const imp of findImports(code)) {
    if (imp.default && !imp.typeOnly)
      defaultImports.set(imp.default, imp.source);
  }
  // only: <identifier>.send(<Component />)
  const sendRe = new RegExp(
    `(${ID}(?:\\??\\.${ID})*)\\??\\.send\\s*\\(\\s*(<([A-Z_$][\\w$]*)\\s*/>)\\s*\\)`,
    "g",
  );

  const results: SendFinderResult[] = [];
  for (const m of code.matchAll(sendRe)) {
    const source = defaultImports.get(m[3]);
    if (!source) continue;

    results.push({
      source,
      identifier: m[1],
      args: [m[2]],
      start: m.index!,
      end: m.index! + m[0].length,
    });
  }
  return results;
}

export default pageFinder;
