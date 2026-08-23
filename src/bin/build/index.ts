import path from "node:path";
import fs from "node:fs";
import { spawn } from "node:child_process";
import { rollup } from "rollup";
import { xanix } from "../plugins/xanix.js";
import nodeResolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import esbuild from "rollup-plugin-esbuild";
import json from "@rollup/plugin-json";

const root = process.cwd();
let child: any;

function start() {
  const filePath = path.join(root, ".xanix", "index.js");
  child = spawn(process.execPath, [filePath], {
    stdio: "inherit",
  });
}

function restart() {
  child?.kill();
  start();
}

const dev = async () => {
  const serverDir = path.resolve(root, ".xanix");

  fs.rmSync(serverDir, {
    recursive: true,
    force: true,
  });

  fs.mkdirSync(serverDir, {
    recursive: true,
  });

  const bundle = await rollup({
    input: "./index.tsx",
    plugins: [
      xanix({
        entries: new Map(),
      }),
      nodeResolve({
        preferBuiltins: true,
        extensions: [".mjs", ".js", ".json", ".ts", ".tsx", ".jsx"],
      }),
      json({
        compact: true,
        preferConst: true,
      }),
      commonjs({
        transformMixedEsModules: true,
      }),
      esbuild({
        target: "es2022",
        platform: "node",
        jsx: "automatic",
        sourceMap: true,
      }),
    ],

    external(id) {
      if (id.startsWith(".") || path.isAbsolute(id)) {
        return false;
      }
      return true;
    },
  });

  await bundle.write({
    dir: serverDir,
    format: "esm",
    sourcemap: true,
    preserveModules: true,
    preserveModulesRoot: root,
  });

  start();
};

export default dev;
