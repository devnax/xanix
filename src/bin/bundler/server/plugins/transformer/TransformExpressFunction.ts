import callbackReplacer from "../../../../modifier/callbackReplacer.js";
import { ImportInfo } from "../../../../modifier/importFinder.js";

const TransformExpressFunction = (code: string, imports: ImportInfo[]) => {
  if (!imports.length) return code;

  const importName = `__xanix_express_${Math.random().toString(36).substring(2, 3)}`;
  let found = false;
  for (let _import of imports) {
    for (let specifier of _import.specifiers) {
      if (specifier.imported === "default") {
        code = callbackReplacer(code, specifier.local, (args) => {
          if (args[0] === `"xanix"`) return;
          found = true;
          return `${importName}("express")`;
        });
      }
    }
  }
  if (found) {
    code = `import { xanix as ${importName} } from "xanix";\n` + code;
  }
  return code;
};

export default TransformExpressFunction;
