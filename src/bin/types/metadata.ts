export interface Metadata {
  // Core
  title?: string | { default: string; template?: string };
  description?: string;
  keywords?: string[];
  charset?: string;
  viewport?: string;
  themeColor?: string | { color: string; media?: string }[];
  baseUrl?: string;
  canonical?: string;

  // Author / site
  author?: string;
  authors?: { name: string; url?: string }[];
  publisher?: string;
  generator?: string;
  applicationName?: string;
  category?: string;

  // Indexing
  robots?:
    | string
    | {
        index?: boolean;
        follow?: boolean;
        noarchive?: boolean;
        nosnippet?: boolean;
        maxSnippet?: number;
        maxImagePreview?: "none" | "standard" | "large";
      };
  verification?: {
    google?: string;
    bing?: string;
    yandex?: string;
    [key: string]: string | undefined;
  };

  // Icons & manifest
  favicon?: string;
  icons?: { icon?: string; apple?: string; shortcut?: string; mask?: string };
  manifest?: string;

  // Social
  openGraph?: {
    type?:
      | "website"
      | "article"
      | "profile"
      | "book"
      | "video.other"
      | "music.song";
    title?: string;
    description?: string;
    url?: string;
    siteName?: string;
    locale?: string;
    images?: { url: string; alt?: string; width?: number; height?: number }[];
    // article-only
    publishedTime?: string;
    modifiedTime?: string;
    authors?: string[];
    tags?: string[];
  };
  twitter?: {
    card?: "summary" | "summary_large_image" | "player" | "app";
    site?: string;
    creator?: string;
    title?: string;
    description?: string;
    image?: string;
  };

  // PWA
  appleWebApp?: {
    capable?: boolean;
    title?: string;
    statusBarStyle?: "default" | "black" | "black-translucent";
  };
  formatDetection?: { telephone?: boolean; email?: boolean; address?: boolean };

  // Structured data
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];

  // Escape hatches
  meta?: {
    name?: string;
    property?: string;
    httpEquiv?: string;
    content: string;
  }[];
  links?: {
    rel: string;
    href: string;
    type?: string;
    sizes?: string;
    media?: string;
    hrefLang?: string;
  }[];
}
