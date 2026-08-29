import "express";

declare global {
  const __XANIX_CLIENT__: boolean;
  const __XANIX_SERVER__: boolean;
}

declare module "express-serve-static-core" {
  interface Request {
    page: {
      setTitle(title: string): void;
      setMeta(name: string, content: string): void;
    };
  }
}

declare module "*.png" {
  const src: string;
  export default src;
}

declare module "*.jpg" {
  const src: string;
  export default src;
}

declare module "*.jpeg" {
  const src: string;
  export default src;
}

declare module "*.gif" {
  const src: string;
  export default src;
}

declare module "*.webp" {
  const src: string;
  export default src;
}

declare module "*.svg" {
  const src: string;
  export default src;
}

declare module "*.ico" {
  const src: string;
  export default src;
}

declare module "*.woff" {
  const src: string;
  export default src;
}

declare module "*.woff2" {
  const src: string;
  export default src;
}

declare module "*.ttf" {
  const src: string;
  export default src;
}

declare module "*.eot" {
  const src: string;
  export default src;
}

declare module "*.css" {
  const src: string;
  export default src;
}

export {};
