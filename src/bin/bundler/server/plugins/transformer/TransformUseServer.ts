import { framworkDir } from "../../../../include/path.js";
import callbackReplacer from "../../../../modifier/callbackReplacer.js";
import type { ImportInfo } from "../../../../modifier/importFinder.js";

const TransformUseServer = (
  code: string,
  imports: ImportInfo[],
  source: string,
) => {
  let codes: string[] = [];

  const replacer = (code: string, cb: string) => {
    return callbackReplacer(code, cb, (args) => {
      const fn = args[0];
      const argString = args[1] ?? "undefined";
      const options = args[2] || "undefined";
      const varname = `_use_server_${Math.random().toString(36).substring(2, 6)}`;
      const server_code = `const ${varname} = ${cb}.server(${fn}, ${options});`;
      codes.push(server_code);
      return `${cb}(${varname}, ${argString})`;
    });
  };

  if (source.startsWith(framworkDir)) {
    code = replacer(code, `useServer`);
  }

  for (let _import of imports) {
    if (_import.namespace) {
      code = replacer(code, `${_import.namespace}.useServer`);
    }
    for (let sp of _import.specifiers) {
      if (sp.imported === "useServer") {
        code = replacer(code, sp.local);
      }
    }
  }

  return codes.join("\n") + "\n" + code;
};
export default TransformUseServer;
