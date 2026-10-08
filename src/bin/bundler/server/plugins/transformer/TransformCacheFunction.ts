import callbackReplacer from "../../../../modifier/callbackReplacer.js";
import { ImportInfo } from "../../../../modifier/importFinder.js";
import { framworkDir } from "../../../../include/path.js";

const TransformCacheFunction = (
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
      return `${cb}(${fn}, ${options}, "${id}");`;
    });
    code = replacedCode;
    return code;
  };

  if (source.startsWith(framworkDir)) {
    code = replacer(code, `cache`);
  }

  for (let _import of imports) {
    if (_import.namespace) {
      code = replacer(code, `${_import.namespace}.cache`);
    }
    for (let sp of _import.specifiers) {
      if (sp.imported === "cache") {
        code = replacer(code, sp.local);
      }
    }
  }
  return code;
};

export default TransformCacheFunction;
