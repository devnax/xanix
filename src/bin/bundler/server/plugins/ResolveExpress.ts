import { Plugin } from "rolldown";
import importFinder from "../../../libs/findImport.js";
import callbackReplacer from "../../../libs/callbackReplacer.js";

const ResolveExpress = (): Plugin => {
  return {
    name: "resolve-express",
    async transform(code) {
      const imports = importFinder(code, "express");
      if (!imports.length) {
        return null;
      }

      let found = false;
      for (let _import of imports) {
        for (let specifier of _import.specifiers) {
          if (specifier.imported === "default") {
            code = callbackReplacer(code, specifier.local, (args) => {
              if (args[0] === `"xanix"`) return;
              found = true;
              return `xpress`;
            });
          }
        }
      }
      if (!found) {
        return null;
      }
      code = `
        import _express from "express"; 
        import registerXanix from "virtual:xanix-route";
        const xpress = _express()
        registerXanix(xpress);
        ${code}
        `;

      return {
        code,
        map: null,
      };
    },
  };
};

export default ResolveExpress;
