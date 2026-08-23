import { watch } from "rollup";
import path from "node:path";
import nodeResolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import esbuild from "rollup-plugin-esbuild";
import { xanix } from "../plugins/xanix.js";
import { XanixClientEntry } from "../plugins/transform";

const root = process.cwd();

export type WatcherOptions = {
  onBuildEnd?: (entries: Map<string, XanixClientEntry>) => void;
};

const WatchServer = ({ onBuildEnd }: WatcherOptions = {}) => {
  const outputDir = path.resolve(root, ".xanix");
  const entries = new Map<string, XanixClientEntry>();

  const watcher = watch({
    input: path.resolve(root, "index.tsx"),
    plugins: [
      xanix({
        entries,
        onChange: (entry) => {
          // entries.set(entry.id, entry);
        },
      }),
      nodeResolve({
        preferBuiltins: true,
      }),
      commonjs(),
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

    output: {
      dir: outputDir,
      format: "esm",
      sourcemap: true,
      // preserveModules: true,
      // preserveModulesRoot: root,
      chunkFileNames: (id) => {
        if (id.type === "chunk") {
          const entry = [...entries.values()].find(
            (e) => e.file === id.facadeModuleId,
          );
          return `pages/${(entry || id).name}.js`;
        }
        if (id.name === "Chunk") {
          return "chunks/[hash].js";
        }

        return "[name].js";
      },
    },
    watch: {
      clearScreen: false,
    },
  });

  watcher.on("event", (event) => {
    switch (event.code) {
      case "BUNDLE_START":
        // console.log("[server] bundling...");
        break;

      case "BUNDLE_END":
        console.log(`[server] built in ${event.duration}ms`);
        onBuildEnd?.(new Map(entries));
        break;
      case "ERROR":
        console.error("[server]", event.error);
        break;
    }
  });

  return watcher;
};

export default WatchServer;
