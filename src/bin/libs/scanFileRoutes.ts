import fg from "fast-glob";
import path from "node:path";

export type FileRoute = {
  type: "page" | "route";
  file: string;
  route: string;
  fileRoute: string;
  layouts: string[];
  loading?: string;
  error?: string;
  notFound?: string;
};

const PAGE_REGEX = /(^|\/)page\.(tsx|ts|jsx|js)$/;
const ROUTE_REGEX = /(^|\/)route\.(ts|js)$/;

type Segment =
  | { type: "static"; value: string }
  | { type: "param"; name: string }
  | { type: "catchall"; name: string }
  | { type: "optional"; name: string };

const EXTENSIONS = ["tsx", "ts", "jsx", "js"];
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

export async function scanFileRoutes(appDir: string): Promise<FileRoute[]> {
  const root = path.resolve(appDir);

  const files = await fg("**/*.{tsx,ts,jsx,js}", {
    cwd: root,
    absolute: true,
    onlyFiles: true,
    ignore: ["**/node_modules/**"],
  });

  const fileMap = new Map<string, string>();
  for (const file of files) {
    fileMap.set(normalize(path.relative(root, file)), file);
  }

  const findFile = (directory: string, name: string): string | undefined => {
    for (const extension of EXTENSIONS) {
      const found = fileMap.get(
        path.posix.join(directory, `${name}.${extension}`),
      );
      if (found) return found;
    }
    return undefined;
  };

  // nearest file of this name in the page's directory or any parent
  const findNearest = (
    segments: string[],
    name: string,
  ): string | undefined => {
    for (let i = segments.length; i >= 0; i--) {
      const found = findFile(segments.slice(0, i).join("/"), name);
      if (found) return found;
    }
    return undefined;
  };

  const entries: { item: FileRoute; segments: Segment[]; shape: string }[] = [];

  for (const file of files) {
    const relative = normalize(path.relative(root, file));
    const type = PAGE_REGEX.test(relative)
      ? "page"
      : ROUTE_REGEX.test(relative)
        ? "route"
        : null;
    if (!type) continue;

    const directory = path.posix.dirname(relative);
    const dirSegments = directory === "." ? [] : directory.split("/");
    const fileRoute = directory === "." ? "/" : `/${directory}`;
    const segments = parseSegments(fileRoute);
    const isPage = type === "page";

    // route handlers (route.ts) have no layouts, loading, error or not-found
    const layouts: string[] = [];
    if (isPage) {
      for (let i = 0; i <= dirSegments.length; i++) {
        const layout = findFile(dirSegments.slice(0, i).join("/"), "layout");
        if (layout) layouts.push(layout);
      }
    }

    entries.push({
      segments,
      shape: shapeOf(segments),
      item: {
        type,
        file,
        route: toExpressRoute(segments),
        fileRoute,
        layouts,
        loading: isPage ? findNearest(dirSegments, "loading") : undefined,
        error: isPage ? findNearest(dirSegments, "error") : undefined,
        notFound: isPage ? findNearest(dirSegments, "not-found") : undefined,
      },
    });
  }

  entries.sort(
    (a, b) =>
      compareRoutes(a.segments, b.segments) ||
      a.item.route.localeCompare(b.item.route) ||
      // same URL: route handler registers before the page
      (a.item.type === b.item.type ? 0 : a.item.type === "route" ? -1 : 1),
  );

  const seen = new Map<string, string>();
  for (const { item, shape } of entries) {
    const key = `${item.type}:${shape}`;
    const previous = seen.get(key);
    if (previous) {
      throw new Error(
        `Duplicate ${item.type} ${item.route}:\n  ${previous}\n  ${item.file}`,
      );
    }
    seen.set(key, item.file);
  }

  return entries.map((e) => e.item);
}
