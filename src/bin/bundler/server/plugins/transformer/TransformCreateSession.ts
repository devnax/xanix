import { frameworkDir } from "../../../../include/utils.js";
import callbackReplacer from "../../../../modifier/callbackReplacer.js";
import { ImportInfo } from "../../../../modifier/importFinder.js";

const TransformCreateSession = (
  code: string,
  imports: ImportInfo[],
  uid: string,
  source: string,
) => {
  let count = 0;
  const replacer = (code: string, cb: string) => {
    const replacedCode = callbackReplacer(code, cb, (args) => {
      const id = uid + count++;
      const fn = args[0];
      const _id = args[1] || `"${id}"`;
      return `${cb}(${fn}, ${_id});`;
    });
    code = replacedCode;
    return code;
  };

  if (source.startsWith(frameworkDir)) {
    code = replacer(code, `createSession`);
  }

  for (let _import of imports) {
    if (_import.namespace) {
      code = replacer(code, `${_import.namespace}.createSession`);
    }
    for (let sp of _import.specifiers) {
      if (sp.imported === "createSession") {
        code = replacer(code, sp.local);
      }
    }
  }
  return code;
};

export default TransformCreateSession;
