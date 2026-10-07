import callbackReplacer from "../../../../modifier/callbackReplacer.js";
import { ImportInfo } from "../../../../modifier/importFinder.js";

const serverFunctionReplacer = (
  code: string,
  imports: ImportInfo[],
  uid: string,
) => {
  let count = 0;
  const replacer = (code: string, cb: string) => {
    const replacedCode = callbackReplacer(code, cb, (args) => {
      if (args[2]) return;
      const id = uid + count++;
      const fn = args[0];
      const options = args[1] || "undefined";
      return `${cb}(${fn}, ${options}, "${id}");`;
    });
    code = replacedCode;
    return code;
  };

  for (let _import of imports) {
    if (_import.namespace) {
      code = replacer(code, `${_import.namespace}.server`);
    }
    for (let sp of _import.specifiers) {
      if (sp.imported === "server") {
        code = replacer(code, sp.local);
      }
    }
  }
  return code;
};

export default serverFunctionReplacer;
