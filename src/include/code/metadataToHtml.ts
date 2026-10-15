import { Metadata } from "../../types/metadata";

const esc = (v: unknown) =>
  String(v)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const attrs = (o: Record<string, unknown>) =>
  Object.entries(o)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => (v === true ? k : `${k}="${esc(v)}"`))
    .join(" ");

const tag = (name: "meta" | "link", o: Record<string, unknown>) =>
  `<${name} ${attrs(o)}>`;

const has = (v: unknown) => v !== undefined && v !== null && v !== "";

export function metadataToHtml(md: Metadata): string {
  const out: string[] = [];
  const base = md.baseUrl;

  // resolve relative URLs against baseUrl
  const abs = (url?: string) => {
    if (!url || !base) return url;
    try {
      return new URL(url, base).toString();
    } catch {
      return url;
    }
  };

  const meta = (
    key: string,
    content: unknown,
    type: "name" | "property" | "http-equiv" = "name",
  ) => {
    if (has(content)) out.push(tag("meta", { [type]: key, content }));
  };
  const og = (key: string, content: unknown) => meta(key, content, "property");
  const link = (o: Record<string, unknown>) => {
    if (has(o.href)) out.push(tag("link", o));
  };

  // ---- Core ----
  out.push(tag("meta", { charset: md.charset ?? "utf-8" }));
  meta("viewport", md.viewport ?? "width=device-width, initial-scale=1");

  const title = typeof md.title === "string" ? md.title : md.title?.default;
  if (title) out.push(`<title>${esc(title)}</title>`);

  meta("description", md.description);
  if (md.keywords?.length) meta("keywords", md.keywords.join(", "));
  link({ rel: "canonical", href: abs(md.canonical) });

  // ---- Author / site ----
  meta("author", md.author);
  md.authors?.forEach((a) => {
    meta("author", a.name);
    if (a.url) link({ rel: "author", href: a.url });
  });
  meta("publisher", md.publisher);
  meta("generator", md.generator);
  meta("application-name", md.applicationName);
  meta("category", md.category);

  // ---- Theme color ----
  if (typeof md.themeColor === "string") {
    meta("theme-color", md.themeColor);
  } else {
    md.themeColor?.forEach((t) =>
      out.push(
        tag("meta", { name: "theme-color", content: t.color, media: t.media }),
      ),
    );
  }

  // ---- Robots ----
  if (md.robots) {
    if (typeof md.robots === "string") {
      meta("robots", md.robots);
    } else {
      const r = md.robots;
      const d: string[] = [];
      if (r.index !== undefined) d.push(r.index ? "index" : "noindex");
      if (r.follow !== undefined) d.push(r.follow ? "follow" : "nofollow");
      if (r.noarchive) d.push("noarchive");
      if (r.nosnippet) d.push("nosnippet");
      if (r.maxSnippet !== undefined) d.push(`max-snippet:${r.maxSnippet}`);
      if (r.maxImagePreview) d.push(`max-image-preview:${r.maxImagePreview}`);
      meta("robots", d.join(", "));
    }
  }

  // ---- Verification ----
  const v = md.verification;
  if (v) {
    const known: Record<string, string> = {
      google: "google-site-verification",
      bing: "msvalidate.01",
      yandex: "yandex-verification",
    };
    Object.entries(v).forEach(([k, val]) => meta(known[k] ?? k, val));
  }

  // ---- Icons & manifest ----
  link({ rel: "icon", href: md.favicon });
  link({ rel: "icon", href: md.icons?.icon });
  link({ rel: "shortcut icon", href: md.icons?.shortcut });
  link({ rel: "apple-touch-icon", href: md.icons?.apple });
  link({ rel: "mask-icon", href: md.icons?.mask });
  link({ rel: "manifest", href: md.manifest });

  // ---- Open Graph ----
  const o = md.openGraph;
  if (o) {
    og("og:type", o.type);
    og("og:title", o.title);
    og("og:description", o.description);
    og("og:url", abs(o.url));
    og("og:site_name", o.siteName);
    og("og:locale", o.locale);
    o.images?.forEach((img) => {
      og("og:image", abs(img.url));
      og("og:image:alt", img.alt);
      og("og:image:width", img.width);
      og("og:image:height", img.height);
    });
    if (o.type === "article") {
      og("article:published_time", o.publishedTime);
      og("article:modified_time", o.modifiedTime);
      o.authors?.forEach((a) => og("article:author", a));
      o.tags?.forEach((t) => og("article:tag", t));
    }
  }

  // ---- Twitter ----
  const t = md.twitter;
  if (t) {
    meta("twitter:card", t.card);
    meta("twitter:site", t.site);
    meta("twitter:creator", t.creator);
    meta("twitter:title", t.title);
    meta("twitter:description", t.description);
    meta("twitter:image", abs(t.image));
  }

  // ---- PWA ----
  const a = md.appleWebApp;
  if (a) {
    if (a.capable) {
      meta("mobile-web-app-capable", "yes");
      meta("apple-mobile-web-app-capable", "yes");
    }
    meta("apple-mobile-web-app-title", a.title);
    meta("apple-mobile-web-app-status-bar-style", a.statusBarStyle);
  }
  if (md.formatDetection) {
    const f = Object.entries(md.formatDetection)
      .filter(([, val]) => val !== undefined)
      .map(([k, val]) => `${k}=${val ? "yes" : "no"}`)
      .join(", ");
    meta("format-detection", f);
  }

  // ---- JSON-LD ----
  if (md.jsonLd) {
    const items = Array.isArray(md.jsonLd) ? md.jsonLd : [md.jsonLd];
    items.forEach((j) =>
      out.push(
        `<script type="application/ld+json">${JSON.stringify(j).replace(/</g, "\\u003c")}</script>`,
      ),
    );
  }

  // ---- Escape hatches ----
  md.meta?.forEach((m) =>
    out.push(
      tag("meta", {
        name: m.name,
        property: m.property,
        "http-equiv": m.httpEquiv,
        content: m.content,
      }),
    ),
  );
  md.links?.forEach((l) =>
    out.push(
      tag("link", {
        rel: l.rel,
        href: l.href,
        type: l.type,
        sizes: l.sizes,
        media: l.media,
        hreflang: l.hrefLang,
      }),
    ),
  );

  return out.join("\n");
}
