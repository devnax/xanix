import url from "@rollup/plugin-url";

const xanixAssets = (options?: { external: boolean }) => {
  return url({
    include: [
      "**/*.jpg",
      "**/*.jpeg",
      "**/*.png",
      "**/*.gif",
      "**/*.webp",
      "**/*.svg",
      "**/*.ico",
      "**/*.woff",
      "**/*.woff2",
      "**/*.ttf",
      "**/*.eot",
    ],
    limit: 0,
    fileName: "assets/[name]-[hash][extname]",
    emitFiles: !(options?.external ?? false),
  });
};

export default xanixAssets;
