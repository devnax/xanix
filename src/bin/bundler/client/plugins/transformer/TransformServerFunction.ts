import callbackReplacer from "../../../../modifier/callbackReplacer.js";
import { ImportInfo } from "../../../../modifier/importFinder.js";
import { framworkDir } from "../../../../include/path.js";

const TransformServerFunction = (
  code: string,
  imports: ImportInfo[],
  uid: string,
  source: string,
) => {
  let count = 0;
  const replacer = (code: string, cb: string) => {
    const replacedCode = callbackReplacer(code, cb, (args) => {
      if (args[2]) return;
      const id = uid + count++;
      const fn = args[0];
      const options = args[1] || "undefined";
      return `${cb}(undefined, ${options}, "${id}");`;
    });
    code = replacedCode;
    return code;
  };
  if (source.startsWith(framworkDir)) {
    code = replacer(code, `server`);
  }

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

export default TransformServerFunction;
