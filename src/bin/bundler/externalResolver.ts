import { Plugin, rollup } from "rollup";
import { xanixDefaultPlugins } from "./plugins/plugins.js";
import { pathToFileURL } from "node:url";
import path from "path";

const makeFilename = (id: string) => {
  let root = process.cwd().replace(/\\/g, "/").replace(/\/+/g, "/");
  id = id
    .trim()
    .replace(/\\/g, "/")
    .replace(/\/+/g, "/")
    .replace(`${root}/`, "")
    .replace("node_modules/", "")
    .toLowerCase()
    // .replace(/\/index\.(js|ts|tsx)$/, "")
    .replace(/\.(js|ts|tsx)$/, "");
  // .replace(/[^a-zA-Z0-9_$]/g, "-");
  return id;
};

const makeEsmShim = async (resolved: string): Promise<string> => {
  let namedExports: string[] = [];
  let hasDefault = false;
  try {
    const mod = await import(pathToFileURL(resolved).href);
    hasDefault =
      mod &&
      (typeof mod === "object" || typeof mod === "function") &&
      "default" in mod;
    namedExports = Object.keys(mod).filter(
      (key) => key !== "__esModule" && key !== "default",
    );
  } catch (err) {
    console.warn(`[cache-deps] failed to inspect ${resolved}:`, err);
  }

  const lines = [`import * as __mod from ${JSON.stringify(resolved)};`];
  lines.push(
    hasDefault ? `export default __mod.default;` : `export default __mod;`,
  );

  for (const exportName of namedExports) {
    if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(exportName)) {
      lines.push(
        `export const ${exportName} = __mod[${JSON.stringify(exportName)}];`,
      );
    }
  }

  return lines.join("\n");
};

const externalResolver = (): Plugin => {
  const cache: Record<string, string> = {};
  return {
    name: "externalResolver",
    async resolveId(source, importer) {
      if (!source.includes("react")) {
        return null;
      }

      const name = makeFilename(source);

      if (cache[source]) {
        // return {
        //   id: path.resolve("node_modules/xanix-cache", `${cache[source]}.js`),
        //   external: "absolute",
        // };
      }

      const build = await rollup({
        input: {
          [name]: source,
        },
        // external: (id) => {
        //   return true;
        // },
        plugins: [
          ...xanixDefaultPlugins({
            target: "server",
            development: true,
            assetExternal: true,
          }),
        ],
      });
      await build.write({
        dir: "node_modules/xanix-cache",
        format: "esm",
        entryFileNames: "[name].js",
      });

      await build.close();

      cache[source] = name;

      return {
        id: "xanix-cache:" + name,
        // external: true,
      };
    },

    async transform(code, id) {
      //replace all imports virtual: with xanix-cache/

      code = code.replaceAll("xanix-cache:", "xanix-cache/");

      const entry = path.resolve(process.cwd(), `index.tsx`);
      if (code.includes("xanix-cache:")) {
        console.log(code);
      }

      return {
        code,
        map: null,
      };
    },
    async generateBundle() {
      // You can use the ids array here if needed
      // const input: any = {};
      // for (const { source: id } of deps) {
      //   const filename = makeFilename(id);
      //   input[filename] = id;
      // }
      // const build = await rollup({
      //   input,
      //   plugins: [
      //     ...xanixDefaultPlugins({
      //       target: "server",
      //       development: true,
      //       assetExternal: true,
      //     }),
      //   ],
      // });
      // await build.write({
      //   dir: ".xanix/cache",
      //   format: "esm",
      //   exports: "named",
      //   entryFileNames: "[name].js",
      // });
    },
  };
};

export default externalResolver;
