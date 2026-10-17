import type { Plugin } from "rolldown";
import { normalize } from "../../../include/utils.js";

export interface XanixChunk {
  file: string;
  modules: string[];
  isEntry: boolean;
}

export function createChunkTracker() {
  const chunks = new Map<string, XanixChunk>();
  const moduleChunks = new Map<string, Set<string>>();

  const plugin: Plugin = {
    name: "xanix:chunk-tracker",

    generateBundle(_options, bundle) {
      chunks.clear();
      moduleChunks.clear();

      for (const output of Object.values(bundle)) {
        if (output.type !== "chunk") continue;

        const chunk: XanixChunk = {
          file: normalize(output.fileName),
          modules: Object.keys(output.modules),
          isEntry: output.isEntry,
        };

        chunks.set(chunk.file, chunk);

        for (const id of chunk.modules) {
          const normalizedId = normalize(id);
          let files = moduleChunks.get(normalizedId);

          if (!files) {
            files = new Set<string>();
            moduleChunks.set(normalizedId, files);
          }

          files.add(chunk.file);
        }
      }
    },
  };

  function getChunksByModule(id: string): XanixChunk[] {
    const filenames = moduleChunks.get(normalize(id));

    if (!filenames) return [];

    return [...filenames]
      .map((filename) => chunks.get(filename))
      .filter((chunk): chunk is XanixChunk => chunk !== undefined);
  }

  function getChunk(fileName: string): XanixChunk | undefined {
    return chunks.get(fileName);
  }

  function getAllChunks(): XanixChunk[] {
    return [...chunks.values()];
  }

  return {
    plugin,
    getChunksByModule,
    getChunk,
    getAllChunks,
  };
}
