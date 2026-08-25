import nodeResolve, {
  RollupNodeResolveOptions,
} from "@rollup/plugin-node-resolve";

const rollupNodeResolve = (
  browser: boolean = true,
  options?: RollupNodeResolveOptions,
) => {
  return nodeResolve({
    extensions: [".mjs", ".js", ".json", ".node", ".ts", ".tsx", ".jsx"],
    browser: browser,
    preferBuiltins: !browser,
    ...options,
  });
};

export default rollupNodeResolve;
