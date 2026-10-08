import callbackReplacer from "../../../../modifier/callbackReplacer.js";
import type { ImportInfo } from "../../../../modifier/importFinder";

const useServerReplacer = (code: string, imports: ImportInfo[]) => {
  if (!imports.length) return code;
  const importName = `__xanix_server_${Math.random().toString(36).substring(2, 3)}`;
  let codes: string[] = [`import { server as ${importName} } from "xanix"`];
  imports.push({
    specifiers: [
      {
        imported: "server",
        local: importName,
      },
    ],
  });

  const replacer = (code: string, cb: string) => {
    return callbackReplacer(code, cb, (args) => {
      const fn = args[0];
      const argString = args[1] ?? "undefined";
      const options = args[2] || "undefined";
      const varname = `_xserver_${Math.random().toString(36).substring(2, 7)}`;
      const server_code = `const ${varname} = ${importName}(${fn}, ${options});`;
      codes.push(server_code);
      return `${cb}(${varname}, ${argString})`;
    });
  };

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
export default useServerReplacer;
