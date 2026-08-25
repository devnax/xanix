import commonjs, { RollupCommonJSOptions } from "@rollup/plugin-commonjs";

const rollupCommonjs = (opt?: RollupCommonJSOptions) => {
  return commonjs({
    include: /node_modules/,
    extensions: [".js", ".cjs"],
    transformMixedEsModules: true,
    ...opt,
  });
};
export default rollupCommonjs;
