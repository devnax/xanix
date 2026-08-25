import esbuild, { Options } from "rollup-plugin-esbuild";

const rollupEsbuild = (options?: Options) => {
  return esbuild({
    target: "es2022",
    platform: "browser",
    format: "esm",
    jsx: "automatic",
    sourceMap: false,
    minify: false,
    include: /\.(mjs|js|cjs|ts|tsx|jsx)$/,
    ...options,
  });
};

export default rollupEsbuild;
