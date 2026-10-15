import fg from "fast-glob";
import path from "node:path";

export type Engine =
  | "react"
  | "ejs"
  | "hbs"
  | "pug"
  | "html"
  | "vue"
  | "svelte";

export type FileRoute = {
  engine: Engine; // from the page file; "react" when the dir has no page
  dir: string; // absolute directory path (forward slashes)
  path: string; // Express route path, e.g. "/blog/:id", "/docs/*all", "/shop{/*slug}"
  page: string | null; // file name in dir: "page.tsx" | "page.jsx" | "page.ejs" | ...
  route: string | null; // file name in dir: "route.ts" | "route.js"
  middleware: string | null; // file name in dir: "middleware.ts" | "middleware.js"
  props: string | null; // file name in dir: "props.ts" | "props.js" (only set when the dir has a page)
  layout: string | null; // the dir's own layout file name for the engine, e.g. "layout.tsx"
  layouts: string[]; // layout files for the engine, outermost -> innermost
  middlewares: string[]; // middleware files from the app root down to this dir, outermost -> innermost
};

type Segment =
  | { type: "static"; value: string }
  | { type: "param"; name: string }
  | { type: "catchall"; name: string }
  | { type: "optional"; name: string };

// page.* picks the engine, layout.* must use the same engine's extension(s)
const ENGINE_EXTS: Record<Engine, string[]> = {
  react: ["tsx", "jsx"],
  ejs: ["ejs"],
  hbs: ["hbs"],
  pug: ["pug"],
  html: ["html"],
  vue: ["vue"],
  svelte: ["svelte"],
};
const ENGINES = Object.keys(ENGINE_EXTS) as Engine[];
const TEMPLATE_EXTS = Object.values(ENGINE_EXTS).flat();
const HANDLER_EXTS = ["ts", "js"];

const PARAM_NAME = /^[A-Za-z_$][\w$]*$/; // valid path-to-regexp param name
const RANK = { static: 0, param: 1, catchall: 2, optional: 3 } as const;

function normalize(file: string): string {
  return file.split(path.sep).join("/");
}

function parseSegments(fileRoute: string): Segment[] {
  const segments: Segment[] = [];

  for (const part of fileRoute.split("/").filter(Boolean)) {
    // (group) folders organize files but are not part of the URL
    if (/^\(.+\)$/.test(part)) continue;

    const dynamic =
      /^\[\[\.\.\.([^\]]+)\]\]$/.exec(part) ??
      /^\[\.\.\.([^\]]+)\]$/.exec(part) ??
      /^\[([^\]]+)\]$/.exec(part);

    if (!dynamic) {
      segments.push({ type: "static", value: part });
      continue;
    }

    const name = dynamic[1];
    if (!PARAM_NAME.test(name)) {
      throw new Error(`Invalid param name "${name}" in ${fileRoute}`);
    }

    segments.push(
      part.startsWith("[[")
        ? { type: "optional", name }
        : part.startsWith("[...")
          ? { type: "catchall", name }
          : { type: "param", name },
    );
  }

  const last = segments.length - 1;
  segments.forEach((segment, i) => {
    if (
      (segment.type === "catchall" || segment.type === "optional") &&
      i !== last
    ) {
      throw new Error(`Catch-all segment must be last: ${fileRoute}`);
    }
  });

  return segments;
}

// Express 5 / path-to-regexp v8 syntax
function toExpressRoute(segments: Segment[]): string {
  let route = "";
  let optional = "";

  for (const segment of segments) {
    if (segment.type === "static") {
      route += "/" + segment.value.replace(/[()[\]{}?+!*:\\]/g, "\\$&");
    } else if (segment.type === "param") {
      route += `/:${segment.name}`;
    } else if (segment.type === "catchall") {
      route += `/*${segment.name}`;
    } else {
      optional = segment.name;
    }
  }

  if (optional) return route ? `${route}{/*${optional}}` : `/{*${optional}}`;
  return route || "/";
}

// Same shape = same URLs (`/users/:id` and `/users/:name` collide)
function shapeOf(segments: Segment[]): string {
  return (
    "/" +
    segments
      .map((s) =>
        s.type === "static"
          ? s.value
          : s.type === "param"
            ? ":"
            : s.type === "catchall"
              ? "*"
              : "{*}",
      )
      .join("/")
  );
}

// Left to right: static beats :param beats *catch-all; shorter first on a tie
function compareRoutes(a: Segment[], b: Segment[]): number {
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    const diff = RANK[a[i].type] - RANK[b[i].type];
    if (diff) return diff;
  }
  return a.length - b.length;
}

/** Express route path for an entry's `dir`: toRoutePath(appDir, item.dir) */
export function toRoutePath(appDir: string, dir: string): string {
  const relative = normalize(path.relative(path.resolve(appDir), dir));
  return toExpressRoute(parseSegments(relative ? `/${relative}` : "/"));
}

export async function scanFileRoutes(appDir: string): Promise<FileRoute[]> {
  const root = path.resolve(appDir);

  const files = await fg(
    [
      `**/{page,layout}.{${TEMPLATE_EXTS.join(",")}}`,
      `**/{route,middleware}.{${HANDLER_EXTS.join(",")}}`,
      `**/{route,middleware,props}.{${HANDLER_EXTS.join(",")}}`,
    ],
    {
      cwd: root,
      absolute: true,
      onlyFiles: true,
      ignore: ["**/node_modules/**"],
    },
  );

  // relative path -> absolute path
  const fileMap = new Map<string, string>();
  const dirs = new Set<string>();

  for (const file of files) {
    const relative = normalize(path.relative(root, file));
    fileMap.set(relative, file);

    const dir = path.posix.dirname(relative);
    dirs.add(dir === "." ? "" : dir);
  }

  const find = (
    dir: string,
    name: string,
    extensions: string[],
  ): string | undefined => {
    for (const extension of extensions) {
      const found = fileMap.get(path.posix.join(dir, `${name}.${extension}`));
      if (found) return found;
    }
    return undefined;
  };

  const entries: { item: FileRoute; segments: Segment[]; shape: string }[] = [];
  const fileName = (file?: string) => (file ? path.posix.basename(file) : null);

  for (const dir of dirs) {
    const engines = ENGINES.filter((e) => find(dir, "page", ENGINE_EXTS[e]));
    if (engines.length > 1) {
      throw new Error(
        `Multiple pages in /${dir} (${engines.join(", ")}). Use one page file per folder.`,
      );
    }

    const engine = engines[0] ?? "react";
    const page = fileName(find(dir, "page", ENGINE_EXTS[engine]));
    const route = fileName(find(dir, "route", HANDLER_EXTS));
    const middleware = fileName(find(dir, "middleware", HANDLER_EXTS));
    const props = page ? fileName(find(dir, "props", HANDLER_EXTS)) : null;

    // folders with only layouts are not entries; pages pick them up via `layouts`
    if (!page && !route && !middleware) continue;

    const dirSegments = dir ? dir.split("/") : [];

    // layouts only apply to pages, and only the ones written for the same engine
    const layouts: string[] = [];
    let layout: string | null = null;

    // middleware applies to everything below it: pages, routes and nested folders
    const middlewares: string[] = [];

    for (let i = 0; i <= dirSegments.length; i++) {
      const parent = dirSegments.slice(0, i).join("/");

      const mw = find(parent, "middleware", HANDLER_EXTS);
      if (mw) middlewares.push(mw);

      if (page) {
        const found = find(parent, "layout", ENGINE_EXTS[engine]);
        if (found) {
          layouts.push(found);
          if (i === dirSegments.length) layout = fileName(found);
        }
      }
    }

    const segments = parseSegments(dir ? `/${dir}` : "/");

    entries.push({
      segments,
      shape: shapeOf(segments),
      item: {
        engine,
        dir: normalize(path.join(root, dir)),
        path: toExpressRoute(segments),
        page,
        route,
        middleware,
        props,
        layout,
        layouts,
        middlewares,
      },
    });
  }

  entries.sort(
    (a, b) =>
      compareRoutes(a.segments, b.segments) ||
      a.item.dir.localeCompare(b.item.dir),
  );

  // two pages (or two route handlers) can't own the same URL
  const seen = new Map<string, string>();
  for (const { item, shape } of entries) {
    for (const kind of ["page", "route"] as const) {
      if (!item[kind]) continue;

      const key = `${kind}:${shape}`;
      const previous = seen.get(key);
      if (previous) {
        throw new Error(
          `Duplicate ${kind} ${shape}:\n  ${previous}\n  ${item.dir}`,
        );
      }
      seen.set(key, item.dir);
    }
  }

  return entries.map((e) => e.item);
}
